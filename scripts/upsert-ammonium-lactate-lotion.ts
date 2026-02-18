import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureVariant(params: {
  base: string
  variantSize: string
  sku?: string | null
  imageUrl?: string | null
  priceDisplay?: string
}) {
  const name = `${params.base} (${params.variantSize})`

  const lookup = await supabase
    .from('products')
    .select('id, sku, name')
    .eq('base_product_name', params.base)
    .eq('variant_size', params.variantSize)
    .limit(1)

  if (lookup.error) throw lookup.error

  if (lookup.data && lookup.data.length) {
    const id = lookup.data[0].id
    const { error } = await supabase
      .from('products')
      .update({
        name,
        brand: 'Perrigo',
        category: 'Over-the-Counter',
        ...(params.sku ? { sku: params.sku } : {}),
        ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
        ...(params.priceDisplay ? { price_display: params.priceDisplay } : {}),
        is_active: true,
      })
      .eq('id', id)
    if (error) throw error
    return { action: 'updated', id, name }
  }

  const insert = await supabase
    .from('products')
    .insert({
      name,
      base_product_name: params.base,
      variant_size: params.variantSize,
      brand: 'Perrigo',
      category: 'Over-the-Counter',
      description:
        'Fragrance-free ammonium lactate lotion 12% for moisturizing and softening dry, scaly skin.',
      image_url: params.imageUrl || null,
      sku: params.sku || null,
      price_display: params.priceDisplay || 'Call for Price',
      in_stock: true,
      is_active: true,
    })
    .select('id, name')
    .single()

  if (insert.error) throw insert.error
  return { action: 'inserted', id: insert.data.id, name: insert.data.name }
}

async function run() {
  const base = 'Ammonium Lactate Lotion 12% Fragrance Free'

  // Existing SKU in your DB for the 225 g size
  const v225 = await ensureVariant({
    base,
    variantSize: '225 g',
    sku: '5940366',
    priceDisplay: '$11.89',
  })

  // New 14 oz / 400 g variant (image added to public/)
  const v14oz = await ensureVariant({
    base,
    variantSize: '14 oz / 400 g',
    imageUrl: '/product-images/ammonium-lactate-lotion-12-fragrance-free-14oz.png',
    priceDisplay: '$11.89',
  })

  console.log('✅ Done')
  console.log('-', v225.action, v225.name)
  console.log('-', v14oz.action, v14oz.name)
}

run().catch((err) => {
  console.error('❌ Upsert failed:', err)
  process.exit(1)
})

