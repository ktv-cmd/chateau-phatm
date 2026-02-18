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

type ProductRow = {
  id: string
  name: string
  sku: string | null
  image_url: string | null
}

function isLikelyHighQualityLocal(filePath: string) {
  if (!fs.existsSync(filePath)) return { ok: false, reason: 'missing local file' }
  const stats = fs.statSync(filePath)
  // Very small files are often broken/placeholder images.
  if (stats.size < 30_000) return { ok: false, reason: `small file (${stats.size} bytes)` }
  return { ok: true, reason: `size ${stats.size} bytes` }
}

async function checkRemote(url: string) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type') || ''
    const contentLength = response.headers.get('content-length') || '0'
    const size = Number(contentLength)

    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` }
    if (!contentType.includes('image')) return { ok: false, reason: `non-image content-type (${contentType})` }
    if (size > 0 && size < 20_000) return { ok: false, reason: `small remote file (${size} bytes)` }

    return { ok: true, reason: `HTTP ${response.status} ${contentType}` }
  } catch {
    return { ok: false, reason: 'request failed' }
  }
}

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, image_url')
    .order('name')

  if (error || !data) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  const aProducts = (data as ProductRow[]).filter((p) => p.name.toUpperCase().startsWith('A'))
  const bad: ProductRow[] = []

  console.log(`Auditing ${aProducts.length} products starting with A...`)

  for (const p of aProducts) {
    const url = p.image_url || ''

    if (!url) {
      bad.push(p)
      console.log(`BAD | ${p.name} | missing image_url`)
      continue
    }

    if (url.startsWith('/')) {
      const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''))
      const result = isLikelyHighQualityLocal(filePath)
      console.log(`${result.ok ? 'OK ' : 'BAD'} | ${p.name} | ${result.reason} | ${url}`)
      if (!result.ok) bad.push(p)
      continue
    }

    const remote = await checkRemote(url)
    console.log(`${remote.ok ? 'OK ' : 'BAD'} | ${p.name} | ${remote.reason} | ${url}`)
    if (!remote.ok) bad.push(p)
  }

  console.log('\nPotential fixes needed:')
  if (bad.length === 0) {
    console.log('None')
    return
  }

  bad.forEach((p) => {
    console.log(`- ${p.name} | sku: ${p.sku || 'n/a'} | current: ${p.image_url || 'none'}`)
  })
}

run()
