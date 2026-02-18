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

async function updateAcetaminophenImage() {
  console.log('🔄 Updating ACETAMINOPHEN TB 325MG 100 RS with real image...\n')
  
  // Find the product
  const { data: products, error: searchError } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%ACETAMINOPHEN TB 325MG%')
  
  if (searchError) {
    console.error('❌ Error finding product:', searchError)
    return
  }
  
  if (!products || products.length === 0) {
    console.log('❌ Product not found')
    return
  }
  
  console.log(`✅ Found ${products.length} matching products:`)
  products.forEach(p => console.log(`   - ${p.name}`))
  
  // Use the first real image we found
  const imageUrl = 'https://i5.walmartimages.com/asr/c26389e7-e7f1-44d7-8760-f426ee79facc_1.c03c56ff51fe39d22243a491c481454d.jpeg'
  
  console.log(`\n🖼️  Image URL: ${imageUrl}`)
  
  // Update all matching products
  for (const product of products) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', product.id)
    
    if (updateError) {
      console.log(`❌ Failed to update ${product.name}`)
    } else {
      console.log(`✅ Updated ${product.name}`)
    }
  }
  
  console.log('\n✅ Done!')
}

updateAcetaminophenImage()
