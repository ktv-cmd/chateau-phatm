import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const product = {
  name: 'Ammonium Lactate Lotion 12% (Fragrance Free) (7.9 oz)',
  base_product_name: 'Ammonium Lactate Lotion 12% (Fragrance Free)',
  variant_size: '7.9 oz',
  brand: 'AmLactin',
  category: 'Skin Care & Topicals',
  description:
    'Ammonium lactate 12% lotion for dry, rough skin. Fragrance-free. Helps exfoliate and hydrate.',
  image_url: '/product-images/ammonium-lactate-lotion-12-ff-7-9oz.png',
  price_display: 'Call for Price',
  in_stock: true,
  is_active: true,
  sku: 'AMLAC-12-FF-7.9OZ'
}

async function run() {
  const { data: existingBySku, error: lookupError } = await supabase
    .from('products')
    .select('id,name,sku')
    .eq('sku', product.sku)
    .maybeSingle()

  if (lookupError) {
    console.error('❌ Lookup failed:', lookupError)
    process.exit(1)
  }

  if (existingBySku?.id) {
    const { error: updateError } = await supabase.from('products').update(product).eq('id', existingBySku.id)
    if (updateError) {
      console.error('❌ Update failed:', updateError)
      process.exit(1)
    }
    console.log(`✅ Updated: ${existingBySku.name} (sku: ${product.sku})`)
    return
  }

  const { error: insertError } = await supabase.from('products').insert(product)
  if (insertError) {
    console.error('❌ Insert failed:', insertError)
    process.exit(1)
  }
  console.log(`✅ Inserted: ${product.name} (sku: ${product.sku})`)
}

run()
