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

// Manual fixes for all problematic groups
const FIXES = [
  // CENTRUM SILVER
  { name: 'CENTRUM SILVER TB 200 WOMEN 50+', base: 'CENTRUM SILVER TB WOMEN 50+', size: '200' },
  { name: 'CENTRUM SILVER TB 65 WOMEN 50+', base: 'CENTRUM SILVER TB WOMEN 50+', size: '65' },
  
  // GLYCERIN
  { name: 'GLYCERIN SU 24 ADULT JAR', base: 'GLYCERIN SU ADULT JAR', size: '24' },
  { name: 'GLYCERIN SU 50 ADULT JAR', base: 'GLYCERIN SU ADULT JAR', size: '50' },
  
  // ICE BAG
  { name: 'ICE BAG 11N', base: 'ICE BAG', size: '11N' },
  { name: 'ICE BAG 6N', base: 'ICE BAG', size: '6N' },
  
  // LDR OMEPRAZOLE
  { name: 'LDR OMEPRAZOLE 24HR TB 20MG 28 DR', base: 'LDR OMEPRAZOLE 24HR TB 20MG DR', size: '28' },
  { name: 'LDR OMEPRAZOLE 24HR TB 20MG 42 DR', base: 'LDR OMEPRAZOLE 24HR TB 20MG DR', size: '42' },
  
  // LUBRIDERM
  { name: 'LUBRIDERM LT 16OZ UNSCENTED', base: 'LUBRIDERM LT UNSCENTED', size: '16OZ' },
  { name: 'LUBRIDERM LT 6OZ UNSCENTED', base: 'LUBRIDERM LT UNSCENTED', size: '6OZ' },
  
  // NEOSPORIN
  { name: 'NEOSPORIN OI 0.5OZ  TUBE', base: 'NEOSPORIN OI TUBE', size: '0.5OZ' },
  { name: 'NEOSPORIN OI 1OZ  TUBE', base: 'NEOSPORIN OI TUBE', size: '1OZ' },
  
  // OMRON
  { name: 'OMRON BLOOD PRESSURE 3 SER U/R', base: 'OMRON BLOOD PRESSURE SER U/R', size: '3' },
  { name: 'OMRON BLOOD PRESSURE 5 SER U/R', base: 'OMRON BLOOD PRESSURE SER U/R', size: '5' },
  
  // THICK-IT
  { name: 'THICK-IT PW 1020GM CONC', base: 'THICK-IT PW CONC', size: '1020GM' },
  { name: 'THICK-IT PW 284GM CONC', base: 'THICK-IT PW CONC', size: '284GM' },
  
  // VOLTAREN
  { name: 'VOLTAREN GL 1% 100GM TOP', base: 'VOLTAREN GL 1% TOP', size: '100GM' },
  { name: 'VOLTAREN GL 1% 50GM TOP', base: 'VOLTAREN GL 1% TOP', size: '50GM' },
]

async function fixAllVariants() {
  console.log('🔧 Fixing All Variant Groupings\n')
  console.log('='.repeat(70))
  console.log(`Fixing ${FIXES.length} products...\n`)
  
  let success = 0
  let failed = 0
  
  for (const fix of FIXES) {
    const { error } = await supabase
      .from('products')
      .update({
        base_product_name: fix.base,
        variant_size: fix.size
      })
      .eq('name', fix.name)
    
    if (error) {
      console.log(`❌ ${fix.name}`)
      failed++
    } else {
      console.log(`✅ ${fix.name} -> "${fix.base}" (size: ${fix.size})`)
      success++
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Results:`)
  console.log(`   ✅ Fixed: ${success}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log('\n='.repeat(70))
  console.log('✅ All variant groupings fixed!')
}

fixAllVariants()
