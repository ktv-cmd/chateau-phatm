import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .ilike('name', '%ADVIL%')
    .order('name')

  if (error || !data) {
    console.error('Query failed:', error?.message)
    process.exit(1)
  }

  for (const product of data) {
    const url = product.image_url || ''
    let ok = false
    let detail = ''

    if (!url) {
      ok = false
      detail = 'missing image_url'
    } else if (url.startsWith('/')) {
      const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''))
      ok = fs.existsSync(filePath)
      detail = ok ? 'local file exists' : 'local file missing'
    } else {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        ok = response.ok
        detail = `HTTP ${response.status}`
      } catch {
        detail = 'request failed'
      }
    }

    console.log(`${ok ? 'OK' : 'BAD'} | ${product.name} | ${detail} | ${url}`)
  }
}

run()
