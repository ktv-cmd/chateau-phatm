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

async function checkAdvilVariants() {
  const { data, error } = await supabase
    .from('products')
    .select('name, base_product_name, variant_size')
    .or('name.ilike.%ADVIL TB 200MG 24 CPLT%,name.ilike.%ADVIL TB 200MG 50 CPLT%')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('\n📋 ADVIL CPLT Products:\n')
  data?.forEach(p => {
    console.log(`Name: ${p.name}`)
    console.log(`Base: ${p.base_product_name}`)
    console.log(`Size: ${p.variant_size}`)
    console.log()
  })
  
  // Fix them manually
  console.log('🔧 Fixing these products...\n')
  
  const fixes = [
    { name: 'ADVIL TB 200MG 24 CPLT', base: 'ADVIL TB 200MG CPLT', size: '24' },
    { name: 'ADVIL TB 200MG 50 CPLT', base: 'ADVIL TB 200MG CPLT', size: '50' },
  ]
  
  for (const fix of fixes) {
    const { error: updateError } = await supabase
      .from('products')
      .update({
        base_product_name: fix.base,
        variant_size: fix.size
      })
      .eq('name', fix.name)
    
    if (updateError) {
      console.log(`❌ Failed to update ${fix.name}`)
    } else {
      console.log(`✅ Fixed ${fix.name} -> base: "${fix.base}", size: "${fix.size}"`)
    }
  }
  
  console.log('\n✅ Done!')
}

checkAdvilVariants()
