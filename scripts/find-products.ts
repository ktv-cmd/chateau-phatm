import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const query = process.argv[2]

if (!query) {
  console.error('Usage: npx tsx scripts/find-products.ts "SEARCH_TERM"')
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
    .ilike('name', `%${query}%`)
    .limit(50)

  if (error) {
    console.error('Lookup failed:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('No matches')
    return
  }

  data.forEach((row) => {
    console.log(`${row.name} | sku: ${row.sku || 'n/a'}`)
  })
}

run()
