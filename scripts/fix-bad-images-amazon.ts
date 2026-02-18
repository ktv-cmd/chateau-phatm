import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
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
  sku: string | null
  image_url: string | null
}

function getArg(name: string): string | undefined {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=')[1] : undefined
}

const limit = Number(getArg('--limit') || '0') || undefined
const offset = Number(getArg('--offset') || '0') || 0
const dryRun = process.argv.includes('--dry-run')
const mode = getArg('--mode') || 'bad' // bad | all

function cleanForSearch(name: string): string {
  return name
    .replace(/\bTB\b/gi, 'Tablets')
    .replace(/\bGC\b/gi, 'Gel Caps')
    .replace(/\bLQGL\b/gi, 'Liquid Gels')
    .replace(/\bCPLT\b/gi, 'Caplets')
    .replace(/\bCW\b/gi, 'Chewable')
    .replace(/\bSS\b/gi, 'Suspension')
    .replace(/\bDR\b/gi, 'Drops')
    .replace(/\bSN\b/gi, 'Spray')
    .replace(/\bOI\b/gi, 'Ointment')
    .replace(/\bLT\b/gi, 'Lotion')
    .replace(/\bCR\b/gi, 'Cream')
    .replace(/\bPA\b/gi, 'Pads')
    .replace(/\bMS\b/gi, 'Maximum Strength')
    .replace(/\bPM\b/gi, 'PM')
    .replace(/\bCHD\b/gi, 'Children')
    .replace(/\bINFANTS?\b/gi, 'Infants')
    .replace(/\bND\b/gi, '')
    .replace(/\bBPK\b/gi, '')
    .replace(/\bSTR\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(
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
        res.on('end', () => {
          resolve(body)
        })
      }
    )
    request.on('error', (error) => reject(error))
  })
}

function extractAmazonImage(html: string): string | null {
  const matches = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.,%\-]+?\.(?:jpg|png)/g) || []
  const cleaned = matches
    .map((url) => url.replace(/&amp;/g, '&'))
    .filter((url) => !url.toLowerCase().includes('sprite'))
    .filter((url) => !url.toLowerCase().includes('play-icon'))

  function score(url: string): number {
    const ul = url.match(/_UL(\d+)/i)
    if (ul) return Number(ul[1])
    const uy = url.match(/_UY(\d+)/i)
    if (uy) return Number(uy[1])
    const sr = url.match(/_SR(\d+),(\d+)/i)
    if (sr) return Math.max(Number(sr[1]), Number(sr[2]))
    return 0
  }

  const best = cleaned.sort((a, b) => score(b) - score(a))[0]
  return best || null
}

async function isBadImage(product: ProductRow): Promise<{ bad: boolean; reason: string }> {
  const url = product.image_url || ''
  if (!url) return { bad: true, reason: 'missing image_url' }

  if (url.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''))
    if (!fs.existsSync(filePath)) return { bad: true, reason: 'missing local file' }
    const size = fs.statSync(filePath).size
    if (size < 30_000) return { bad: true, reason: `small local file (${size})` }
    return { bad: false, reason: `local file size ${size}` }
  }

  try {
    const response = await fetch(url, { method: 'HEAD' })
    const ct = response.headers.get('content-type') || ''
    const cl = Number(response.headers.get('content-length') || '0')
    if (!response.ok) return { bad: true, reason: `HTTP ${response.status}` }
    if (!ct.includes('image')) return { bad: true, reason: `non-image content (${ct})` }
    if (cl > 0 && cl < 20_000) return { bad: true, reason: `small remote file (${cl})` }
    return { bad: false, reason: `HTTP ${response.status}` }
  } catch {
    return { bad: true, reason: 'request failed' }
  }
}

async function searchAmazonImage(productName: string): Promise<string | null> {
  const query = cleanForSearch(productName)
  const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`
  const html = await httpGet(url)
  return extractAmazonImage(html)
}

async function run() {
  const { data, error } = await supabase.from('products').select('id,name,sku,image_url')
  if (error || !data) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  const allProducts = (data as ProductRow[]).slice().sort((a, b) => a.name.localeCompare(b.name))
  const badProducts: Array<{ product: ProductRow; reason: string }> = []
  for (const product of allProducts) {
    const result = await isBadImage(product)
    if (result.bad) badProducts.push({ product, reason: result.reason })
  }

  const source = mode === 'all'
    ? allProducts.map((product) => ({ product, reason: 'forced refresh (mode=all)' }))
    : badProducts

  const paged = source.slice(offset)
  const targets = limit ? paged.slice(0, limit) : paged
  console.log(`Bad images found: ${badProducts.length}`)
  console.log(`Mode: ${mode}`)
  console.log(`Offset: ${offset}`)
  console.log(`Processing: ${targets.length}${dryRun ? ' (dry-run)' : ''}`)

  let fixed = 0
  const unresolved: Array<{ name: string; reason: string }> = []

  for (const { product, reason } of targets) {
    console.log(`\n${product.name}`)
    console.log(`Current issue: ${reason}`)

    try {
      const amazonImage = await searchAmazonImage(product.name)
      if (!amazonImage) {
        unresolved.push({ name: product.name, reason: 'No Amazon image match' })
        console.log('No Amazon image match')
        continue
      }

      console.log(`Found Amazon image: ${amazonImage}`)
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: amazonImage })
          .eq('id', product.id)

        if (updateError) {
          unresolved.push({ name: product.name, reason: updateError.message })
          console.log(`Update failed: ${updateError.message}`)
          continue
        }
      }

      fixed += 1
      console.log('Updated successfully')
    } catch (err) {
      const message = (err as Error).message
      unresolved.push({ name: product.name, reason: message })
      console.log(`Failed: ${message}`)
    }
  }

  console.log('\n--- RESULT ---')
  console.log(`Fixed: ${fixed}`)
  console.log(`Unresolved: ${unresolved.length}`)
  if (unresolved.length > 0) {
    unresolved.forEach((item) => {
      console.log(`- ${item.name}: ${item.reason}`)
    })
  }
}

run()
