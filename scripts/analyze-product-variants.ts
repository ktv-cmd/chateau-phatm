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

interface ProductGroup {
  baseName: string
  variants: Array<{
    id: string
    fullName: string
    size: string
    price: string
    priceCents: number | null
  }>
}

// Extract size/count from product name
function extractSizeInfo(name: string): { baseName: string; size: string } {
  // Common patterns: "24", "100", "50", "30ML", "60ML", "4OZ", etc.
  const sizePatterns = [
    /\b(\d+(?:\.\d+)?(?:MG|ML|MCG|OZ|GM|LB|G|CC)?)\s*$/i,  // At end: "200MG 24"
    /\b(\d+)\s*$/,  // Just number at end: "24"
    /\s+(\d+(?:\.\d+)?(?:MG|ML|MCG|OZ|GM|LB|G|CC))\b/i,  // With unit anywhere
  ]
  
  // Try to find size pattern
  for (const pattern of sizePatterns) {
    const match = name.match(pattern)
    if (match) {
      const size = match[1]
      const baseName = name.replace(match[0], '').trim()
      return { baseName, size }
    }
  }
  
  return { baseName: name, size: 'Standard' }
}

// Normalize product name to find groups
function normalizeProductName(name: string): string {
  return name
    .replace(/\b\d+(?:\.\d+)?(?:MG|ML|MCG|OZ|GM|LB|G|CC)?\b/gi, '') // Remove all numbers and units
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

async function analyzeVariants() {
  console.log('🔍 Analyzing Products for Variants\n')
  console.log('='.repeat(70))
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price_display, price_cents')
    .order('name')
  
  if (error || !products) {
    console.error('❌ Error fetching products:', error)
    return
  }
  
  console.log(`✅ Found ${products.length} products\n`)
  
  // Group products by normalized name
  const groups: Record<string, ProductGroup> = {}
  
  products.forEach(product => {
    const { baseName, size } = extractSizeInfo(product.name)
    const normalizedBase = normalizeProductName(baseName)
    
    if (!groups[normalizedBase]) {
      groups[normalizedBase] = {
        baseName,
        variants: []
      }
    }
    
    groups[normalizedBase].variants.push({
      id: product.id,
      fullName: product.name,
      size,
      price: product.price_display,
      priceCents: product.price_cents
    })
  })
  
  // Find groups with multiple variants
  const multiVariantGroups = Object.values(groups).filter(g => g.variants.length > 1)
  
  console.log(`📊 Analysis Results:`)
  console.log(`   Total unique base products: ${Object.keys(groups).length}`)
  console.log(`   Products with multiple variants: ${multiVariantGroups.length}`)
  console.log(`   Single-variant products: ${Object.keys(groups).length - multiVariantGroups.length}\n`)
  
  // Show top 20 multi-variant groups
  console.log('🔄 Top Products with Multiple Sizes/Variants:\n')
  
  const sortedGroups = multiVariantGroups
    .sort((a, b) => b.variants.length - a.variants.length)
    .slice(0, 20)
  
  sortedGroups.forEach((group, i) => {
    console.log(`${i + 1}. ${group.baseName}`)
    console.log(`   Variants: ${group.variants.length}`)
    group.variants.forEach(v => {
      console.log(`   - Size: ${v.size.padEnd(15)} Price: ${v.price.padEnd(10)} (${v.fullName})`)
    })
    console.log()
  })
  
  console.log('='.repeat(70))
  console.log('\n💡 Recommendation: Add "variant_size" and "base_product_name" fields')
  console.log('   This will allow grouping in the UI with size selection dropdowns')
}

analyzeVariants()
