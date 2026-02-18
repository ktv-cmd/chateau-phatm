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

// Extract size/count from product name
function extractVariantInfo(name: string): { baseName: string; size: string } {
  // Patterns to match size - ordered by specificity
  const patterns = [
    // Number before suffix: "ADVIL TB 200MG 24 CPLT" -> base: "ADVIL TB 200MG CPLT", size: "24"
    { regex: /\s+(\d+(?:\.\d+)?)\s+(CPLT|EC|DR|ER|IR|MS|ND|RS|BPK|LQGL|SFG|QD|SF|G\/F|W\/HOOK|W\/ALOE|EZCP|O\/S|LF|STR|ASTD|CHD|GRP|SHFPK|ADULT|JAR|TUBE)\b/i, 
      extract: (name: string, size: string) => {
        // Remove the size number but keep the suffix
        return name.replace(new RegExp(`\\s+${size}\\s+`, 'i'), ' ').trim()
      }
    },
    // Number at end: "ADVIL TB 200MG 24" -> base: "ADVIL TB 200MG", size: "24"
    { regex: /\s+(\d+(?:\.\d+)?)\s*$/, extract: (name: string, match: string) => name.replace(match, '').trim() },
    // Size with unit at end: "NEOSPORIN OI 0.5OZ" -> base: "NEOSPORIN OI", size: "0.5OZ"
    { regex: /\s+(\d+(?:\.\d+)?(?:OZ|ML|GM|MG|MCG|LB|G|CC))\s*$/i, extract: (name: string, match: string) => name.replace(match, '').trim() },
  ]
  
  for (const pattern of patterns) {
    const match = name.match(pattern.regex)
    if (match) {
      const size = match[1]
      const baseName = pattern.extract(name, match[0])
      return { baseName, size }
    }
  }
  
  return { baseName: name, size: 'Standard' }
}

async function populateVariants() {
  console.log('🔄 Populating Product Variant Fields\n')
  console.log('='.repeat(70))
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name')
    .order('name')
  
  if (error || !products) {
    console.error('❌ Error fetching products:', error)
    return
  }
  
  console.log(`✅ Found ${products.length} products\n`)
  console.log('📝 Processing...\n')
  
  let updated = 0
  let failed = 0
  
  for (const product of products) {
    const { baseName, size } = extractVariantInfo(product.name)
    
    const { error: updateError } = await supabase
      .from('products')
      .update({
        base_product_name: baseName,
        variant_size: size
      })
      .eq('id', product.id)
    
    if (updateError) {
      console.log(`❌ Failed: ${product.name}`)
      failed++
    } else {
      updated++
      if (updated % 50 === 0) {
        console.log(`   Processed ${updated}/${products.length}...`)
      }
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Results:`)
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log('\n='.repeat(70))
}

populateVariants()
