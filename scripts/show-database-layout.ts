import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function showDatabaseLayout() {
  console.log('\n📊 HOW PRODUCTS ARE STORED IN DATABASE\n')
  console.log('='.repeat(80))
  
  // Example 1: ADVIL with 3 variants
  console.log('\n📦 Example 1: ADVIL TB 200MG (3 sizes)\n')
  const { data: advilProducts } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%ADVIL TB 200MG%')
    .not('name', 'ilike', '%CPLT%')
    .not('name', 'ilike', '%PM%')
    .not('name', 'ilike', '%DUAL%')
    .not('name', 'ilike', '%JUNIOR%')
    .not('name', 'ilike', '%GC%')
    .order('name')
    .limit(3)
  
  advilProducts?.forEach((p, i) => {
    console.log(`Row ${i + 1}:`)
    console.log(`  id:                 ${p.id}`)
    console.log(`  name:               "${p.name}"`)
    console.log(`  base_product_name:  "${p.base_product_name}"`)
    console.log(`  variant_size:       "${p.variant_size}"`)
    console.log(`  sku:                ${p.sku}`)
    console.log(`  price_display:      ${p.price_display}`)
    console.log(`  price_cents:        ${p.price_cents}`)
    console.log(`  category:           ${p.category}`)
    console.log(`  brand:              ${p.brand}`)
    console.log(`  image_url:          ${p.image_url?.substring(0, 50)}...`)
    console.log(`  in_stock:           ${p.in_stock}`)
    console.log()
  })
  
  // Example 2: NEOSPORIN with 2 variants
  console.log('─'.repeat(80))
  console.log('\n📦 Example 2: NEOSPORIN OI TUBE (2 sizes)\n')
  const { data: neosporinProducts } = await supabase
    .from('products')
    .select('*')
    .eq('base_product_name', 'NEOSPORIN OI TUBE')
    .order('variant_size')
  
  neosporinProducts?.forEach((p, i) => {
    console.log(`Row ${i + 1}:`)
    console.log(`  id:                 ${p.id}`)
    console.log(`  name:               "${p.name}"`)
    console.log(`  base_product_name:  "${p.base_product_name}"`)
    console.log(`  variant_size:       "${p.variant_size}"`)
    console.log(`  sku:                ${p.sku}`)
    console.log(`  price_display:      ${p.price_display}`)
    console.log()
  })
  
  // Example 3: Single product (no variants)
  console.log('─'.repeat(80))
  console.log('\n📦 Example 3: Single Product (no variants)\n')
  const { data: singleProduct } = await supabase
    .from('products')
    .select('*')
    .eq('name', 'ACETAMINOPHEN TB 325MG 100 RS')
    .single()
  
  if (singleProduct) {
    console.log(`Row:`)
    console.log(`  id:                 ${singleProduct.id}`)
    console.log(`  name:               "${singleProduct.name}"`)
    console.log(`  base_product_name:  "${singleProduct.base_product_name}"`)
    console.log(`  variant_size:       "${singleProduct.variant_size}"`)
    console.log(`  sku:                ${singleProduct.sku}`)
    console.log(`  price_display:      ${singleProduct.price_display}`)
    console.log()
  }
  
  console.log('='.repeat(80))
  console.log('\n💡 KEY POINTS:\n')
  console.log('1. Each SIZE = Separate database row')
  console.log('2. All variants have same "base_product_name"')
  console.log('3. Each variant has different "variant_size"')
  console.log('4. Each variant has unique SKU and price')
  console.log('5. Website UI groups them by "base_product_name"')
  console.log('6. Customer sees ONE card with size dropdown')
  console.log()
  console.log('='.repeat(80))
}

showDatabaseLayout()
