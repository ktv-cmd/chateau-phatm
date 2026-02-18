import dotenv from 'dotenv'
import https from 'https'
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

type ProductRow = {
  id: string
  name: string
  image_url: string | null
}

function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0].toUpperCase()
}

function getArg(name: string): string | undefined {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=')[1] : undefined
}

const limit = Number(getArg('--limit') || '0') || undefined

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => resolve(body))
      }
    )
    req.on('error', reject)
  })
}

function extractBestAmazonImage(html: string): string | null {
  const matches = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.,%\-]+?\.(?:jpg|png)/g) || []
  const cleaned = [...new Set(matches.map((u) => u.replace(/&amp;/g, '&')))]

  function score(url: string): number {
    const ul = url.match(/_UL(\d+)/i)
    if (ul) return Number(ul[1])
    const uy = url.match(/_UY(\d+)/i)
    if (uy) return Number(uy[1])
    const sr = url.match(/_SR(\d+),(\d+)/i)
    if (sr) return Math.max(Number(sr[1]), Number(sr[2]))
    return 0
  }

  cleaned.sort((a, b) => score(b) - score(a))
  return cleaned[0] || null
}

async function searchAmazonExact(name: string): Promise<string | null> {
  const query = `"${name}"`
  const html = await httpGet(`https://www.amazon.com/s?k=${encodeURIComponent(query)}`)
  return extractBestAmazonImage(html)
}

async function run() {
  const { data, error } = await supabase.from('products').select('id,name,image_url').order('name')
  if (error || !data) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  const byUrl = new Map<string, ProductRow[]>()
  for (const p of data as ProductRow[]) {
    if (!p.image_url) continue
    if (!byUrl.has(p.image_url)) byUrl.set(p.image_url, [])
    byUrl.get(p.image_url)!.push(p)
  }

  // Suspicious: same image URL used by 2+ products with different first tokens.
  const suspiciousGroups = [...byUrl.entries()]
    .filter(([, products]) => products.length > 1)
    .filter(([, products]) => new Set(products.map((p) => firstToken(p.name))).size > 1)

  const targets = suspiciousGroups.flatMap(([, products]) => products)
  const uniqueTargets = Array.from(new Map(targets.map((p) => [p.id, p])).values())
  const finalTargets = limit ? uniqueTargets.slice(0, limit) : uniqueTargets

  console.log(`Suspicious duplicate groups: ${suspiciousGroups.length}`)
  console.log(`Products to repair: ${finalTargets.length}`)

  let fixed = 0
  const unresolved: string[] = []

  for (const product of finalTargets) {
    console.log(`\n${product.name}`)
    try {
      const image = await searchAmazonExact(product.name)
      if (!image) {
        unresolved.push(`${product.name}: no exact Amazon image`)
        console.log('No exact Amazon image')
        continue
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: image })
        .eq('id', product.id)

      if (updateError) {
        unresolved.push(`${product.name}: ${updateError.message}`)
        console.log(`Update failed: ${updateError.message}`)
        continue
      }

      fixed += 1
      console.log(`Updated -> ${image}`)
    } catch (err) {
      const msg = (err as Error).message
      unresolved.push(`${product.name}: ${msg}`)
      console.log(`Failed: ${msg}`)
    }
  }

  console.log('\n--- RESULT ---')
  console.log(`Fixed: ${fixed}`)
  console.log(`Unresolved: ${unresolved.length}`)
  if (unresolved.length > 0) {
    unresolved.forEach((line) => console.log(`- ${line}`))
  }
}

run()
