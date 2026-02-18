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

async function consolidateVariants() {
  console.log('🔄 Consolidating Product Variants\n')
  console.log('='.repeat(70))
  console.log('⚠️  This will delete duplicate variant products and keep only the base product\n')
  
  // Get all products grouped by base_product_name
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, base_product_name, variant_size, price_display, price_cents, image_url, sku')
    .order('base_product_name, variant_size')
  
  if (error || !products) {
    console.error('❌ Error:', error)
    return
  }
  
  // Group products by base_product_name
  const groups: Record<string, any[]> = {}
  products.forEach(product => {
    const base = product.base_product_name || product.name
    if (!groups[base]) {
      groups[base] = []
    }
    groups[base].push(product)
  })
  
  const stats = {
    totalGroups: Object.keys(groups).length,
    multiVariantGroups: 0,
    productsToDelete: 0,
    productsToKeep: 0,
  }
  
  console.log('📊 Analysis:')
  console.log(`   Total product groups: ${stats.totalGroups}`)
  
  const multiVariantGroups = Object.entries(groups).filter(([_, prods]) => prods.length > 1)
  stats.multiVariantGroups = multiVariantGroups.length
  
  console.log(`   Groups with multiple variants: ${stats.multiVariantGroups}`)
  console.log(`   Single products: ${stats.totalGroups - stats.multiVariantGroups}\n`)
  
  if (multiVariantGroups.length > 0) {
    console.log('🔧 Groups to consolidate:\n')
    
    multiVariantGroups.forEach(([baseName, variants], i) => {
      console.log(`${i + 1}. ${baseName} (${variants.length} variants)`)
      variants.forEach(v => {
        console.log(`   - Size: ${v.variant_size} | Price: ${v.price_display} | SKU: ${v.sku}`)
      })
      
      // Keep the first variant, mark others for deletion
      stats.productsToKeep++
      stats.productsToDelete += (variants.length - 1)
      
      console.log(`   ✅ Will keep: ${variants[0].name}`)
      console.log(`   ❌ Will delete: ${variants.length - 1} duplicate(s)\n`)
    })
  }
  
  console.log('='.repeat(70))
  console.log('\n📊 Summary:')
  console.log(`   Products to keep: ${stats.productsToKeep + (stats.totalGroups - stats.multiVariantGroups)}`)
  console.log(`   Products to delete: ${stats.productsToDelete}`)
  console.log(`   Final product count: ${products.length - stats.productsToDelete}`)
  
  console.log('\n⚠️  WARNING: This will DELETE products from the database!')
  console.log('⚠️  This may break existing carts and orders!')
  console.log('\n💡 RECOMMENDATION: Keep all variants as separate products.')
  console.log('   The UI already groups them nicely with size selectors.')
  console.log('   This maintains data integrity and order history.')
  console.log('\n='.repeat(70))
}

consolidateVariants()
