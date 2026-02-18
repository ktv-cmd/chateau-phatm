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
  const { data, error } = await supabase.from('products').select('name, image_url').order('name')
  if (error || !data) {
    console.error('Query failed:', error?.message)
    process.exit(1)
  }

  let ok = 0
  let missing = 0
  let broken = 0
  let small = 0
  const examples: Array<{ name: string; issue: string; image_url: string | null }> = []

  for (const product of data) {
    const url = product.image_url
    if (!url) {
      missing += 1
      if (examples.length < 20) examples.push({ name: product.name, issue: 'missing', image_url: null })
      continue
    }

    if (url.startsWith('/')) {
      const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''))
      if (!fs.existsSync(filePath)) {
        broken += 1
        if (examples.length < 20) examples.push({ name: product.name, issue: 'local file missing', image_url: url })
        continue
      }
      const size = fs.statSync(filePath).size
      if (size < 30_000) {
        small += 1
        if (examples.length < 20) examples.push({ name: product.name, issue: `small local (${size})`, image_url: url })
        continue
      }
      ok += 1
      continue
    }

    try {
      const response = await fetch(url, { method: 'HEAD' })
      const contentType = response.headers.get('content-type') || ''
      const length = Number(response.headers.get('content-length') || '0')
      if (!response.ok || !contentType.includes('image')) {
        broken += 1
        if (examples.length < 20) {
          examples.push({ name: product.name, issue: `remote bad (${response.status} ${contentType})`, image_url: url })
        }
      } else if (length > 0 && length < 20_000) {
        small += 1
        if (examples.length < 20) examples.push({ name: product.name, issue: `small remote (${length})`, image_url: url })
      } else {
        ok += 1
      }
    } catch {
      broken += 1
      if (examples.length < 20) examples.push({ name: product.name, issue: 'remote request failed', image_url: url })
    }
  }

  console.log(JSON.stringify({ total: data.length, ok, missing, broken, small, examples }, null, 2))
}

run()
