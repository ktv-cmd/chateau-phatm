import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { makeFriendlyProductParts } from '../lib/products/friendlyName'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateFriendlyNames() {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-n')

  console.log('✨ Rewriting Product Names (friendly + searchable)\n')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no database writes)' : 'LIVE (will update Supabase)'}`)
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
  console.log('🔄 Processing...\n')
  
  let updated = 0
  let skipped = 0
  let failed = 0
  const examples: Array<{ before: string; after: string }> = []
  
  for (const product of products) {
    const parts = makeFriendlyProductParts(product.name, product.base_product_name, product.variant_size)
    
    const nextName = parts.fullName
    const nextBase = parts.baseName
    const nextVariant = parts.variantSize

    const changed =
      nextName !== product.name ||
      nextBase !== (product.base_product_name || '') ||
      (nextVariant || null) !== (product.variant_size || null)

    if (!changed) {
      skipped++
      continue
    }

    if (examples.length < 10) {
      examples.push({ before: product.name, after: nextName })
    }

    if (isDryRun) {
      updated++
      continue
    }

    const { error: updateError } = await supabase.from('products').update({
      name: nextName,
      base_product_name: nextBase,
      variant_size: nextVariant
    }).eq('id', product.id)
    
    if (updateError) {
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
  console.log(`   ✅ Would update / Updated: ${updated}`)
  console.log(`   ⏭️  Skipped (already good): ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  if (examples.length) {
    console.log('\n🔎 Examples:')
    examples.forEach((ex) => {
      console.log(`   - ${ex.before}`)
      console.log(`     → ${ex.after}`)
    })
  }
  console.log('\n' + '='.repeat(70))
  console.log('✅ Done.')
}

updateFriendlyNames()
