import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const nameQuery = process.argv[2]
const imageUrl = process.argv[3]

if (!nameQuery || !imageUrl) {
  console.error('Usage: npx tsx scripts/update-product-image.ts "NAME" "IMAGE_URL"')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku')
    .ilike('name', `%${nameQuery}%`)

  if (error) {
    console.error('Lookup failed:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.error('No products matched:', nameQuery)
    process.exit(1)
  }

  const ids = data.map((row) => row.id)
  const { error: updateError } = await supabase
    .from('products')
    .update({ image_url: imageUrl })
    .in('id', ids)

  if (updateError) {
    console.error('Update failed:', updateError.message)
    process.exit(1)
  }

  console.log(`Updated ${ids.length} product(s):`)
  data.forEach((row) => {
    console.log(`- ${row.name} (sku: ${row.sku || 'n/a'})`)
  })
}

run()
