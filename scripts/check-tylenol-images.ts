import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('name, image_url, description')
    .ilike('name', '%TYLENOL%')
    .order('name')

  if (error || !data) {
    console.error('Failed:', error?.message)
    process.exit(1)
  }

  data.forEach((p) => {
    console.log(`\n${p.name}`)
    console.log(`  Image: ${p.image_url?.substring(0, 80) || 'NONE'}`)
    console.log(`  Desc:  ${p.description?.substring(0, 80) || 'NONE'}...`)
  })
}

run()
