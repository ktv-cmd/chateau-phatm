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

// Normalize name by removing all numbers and units to find similar products
function normalizeForGrouping(name: string): string {
  return name
    .replace(/\b\d+(?:\.\d+)?(?:MG|ML|MCG|OZ|GM|LB|G|CC|%|N|X)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

async function findUngroupedVariants() {
  console.log('🔍 Finding Products That Should Be Grouped\n')
  console.log('='.repeat(70))
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, base_product_name, variant_size')
    .order('name')
  
  if (error || !products) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`✅ Found ${products.length} products\n`)
  
  // Group by normalized name
  const groups: Record<string, any[]> = {}
  
  products.forEach(product => {
    const normalized = normalizeForGrouping(product.name)
    if (!groups[normalized]) {
      groups[normalized] = []
    }
    groups[normalized].push(product)
  })
  
  // Find groups with multiple products but different base_product_name
  const problematicGroups = Object.entries(groups)
    .filter(([_, products]) => {
      if (products.length <= 1) return false
      // Check if they have different base_product_name values
      const bases = new Set(products.map(p => p.base_product_name))
      return bases.size > 1
    })
    .sort((a, b) => b[1].length - a[1].length)
  
  console.log(`📊 Found ${problematicGroups.length} product groups that need fixing\n`)
  
  if (problematicGroups.length > 0) {
    console.log('🔧 Products that should be grouped together:\n')
    
    problematicGroups.slice(0, 30).forEach(([normalized, products], i) => {
      console.log(`${i + 1}. Group (${products.length} variants):`)
      products.forEach(p => {
        console.log(`   - ${p.name}`)
        console.log(`     Base: "${p.base_product_name}" | Size: "${p.variant_size}"`)
      })
      console.log()
    })
  }
  
  console.log('='.repeat(70))
}

findUngroupedVariants()
