import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function toFullResAmazon(url: string): string {
  // Converts thumbnail-style Amazon URLs to base image URLs.
  // Example: .../I/71abc._AC_SR160,134_QL70_.jpg -> .../I/71abc.jpg
  return url.replace(/\._[^/]*_\.(jpg|png)$/i, '.$1')
}

async function run() {
  const { data, error } = await supabase.from('products').select('id, name, image_url')
  if (error || !data) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  const targets = data.filter(
    (p) => typeof p.image_url === 'string' && p.image_url.includes('m.media-amazon.com/images/I/')
  )

  let updated = 0
  for (const product of targets) {
    const current = product.image_url as string
    const normalized = toFullResAmazon(current)
    if (normalized === current) continue

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: normalized })
      .eq('id', product.id)

    if (updateError) {
      console.log(`FAILED | ${product.name} | ${updateError.message}`)
      continue
    }

    updated += 1
    console.log(`UPDATED | ${product.name}`)
  }

  console.log(`\nUpdated Amazon URLs: ${updated}`)
}

run()
