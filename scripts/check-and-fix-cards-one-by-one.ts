import dotenv from 'dotenv'
import fs from 'fs'
import https from 'https'
import path from 'path'
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

type Health = {
  ok: boolean
  reason: string
  size: number
}

type AmazonCandidate = {
  imageUrl: string
  sourceText: string
}

function getArg(name: string): string | undefined {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.slice(name.length + 1) : undefined
}

const limit = Number(getArg('--limit') || '0') || undefined
const offset = Number(getArg('--offset') || '0') || 0

function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0].toUpperCase()
}

function cleanForSearch(name: string): string {
  return name
    .replace(/\bTB\b/gi, 'tablets')
    .replace(/\bGC\b/gi, 'gel caps')
    .replace(/\bLQGL\b/gi, 'liquid gels')
    .replace(/\bCPLT\b/gi, 'caplets')
    .replace(/\bCP\b/gi, 'capsules')
    .replace(/\bSU\b/gi, 'suppositories')
    .replace(/\bSN\b/gi, 'spray')
    .replace(/\bDR\b/gi, 'drops')
    .replace(/\bCR\b/gi, 'cream')
    .replace(/\bLT\b/gi, 'lotion')
    .replace(/\bPA\b/gi, 'pads')
    .replace(/\bOI\b/gi, 'ointment')
    .replace(/\bLDR\b/gi, 'leader')
    .replace(/\bCHD\b/gi, 'children')
    .replace(/[/%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function inferFormAliases(name: string): string[][] {
  const upper = name.toUpperCase()
  const forms: string[][] = []
  if (/\bLQGL\b/.test(upper)) forms.push(['liquid gel', 'liquid gels', 'liquigel', 'softgel', 'softgels'])
  if (/\bGC\b/.test(upper)) forms.push(['gel cap', 'gel caps', 'liquid gel', 'softgel'])
  if (/\bTB\b/.test(upper)) forms.push(['tablet', 'tablets'])
  if (/\bCPLT\b/.test(upper)) forms.push(['caplet', 'caplets'])
  if (/\bCP\b/.test(upper)) forms.push(['capsule', 'capsules'])
  if (/\bSN\b/.test(upper)) forms.push(['spray', 'nasal spray'])
  if (/\bCR\b/.test(upper)) forms.push(['cream'])
  if (/\bOI\b/.test(upper)) forms.push(['ointment'])
  if (/\bPA\b/.test(upper)) forms.push(['pads', 'pad'])
  return forms
}

function inferCountCandidates(name: string): number[] {
  const upper = name.toUpperCase()
  const counts = new Set<number>()

  // Strong signals: explicit unit after a number (ct/count/tablets/capsules/etc.).
  const explicit = [...upper.matchAll(/\b(\d{1,3})\s*(CT|COUNT|TABLET|TABLETS|CAPLET|CAPLETS|CAPSULE|CAPSULES|SOFTGEL|SOFTGELS|PACK|EA)\b/g)]
  for (const m of explicit) counts.add(Number(m[1]))

  // Common shorthand pattern "... 12 12H ..." where first number is count.
  const hPattern = upper.match(/\b(\d{1,3})\s+\d{1,2}H\b/)
  if (hPattern) counts.add(Number(hPattern[1]))

  return [...counts].filter((n) => n > 0 && n <= 500)
}

function extractAmazonCandidates(html: string): AmazonCandidate[] {
  const imageMatches = [...html.matchAll(/<img[^>]*class="s-image"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.(?:jpg|png)[^"]*)"/g)]
  const titleMatches = [...html.matchAll(/<span class="a-size-base-plus a-color-base a-text-normal">([\s\S]*?)<\/span>/g)]

  const candidates: AmazonCandidate[] = []
  const max = Math.min(imageMatches.length, titleMatches.length)
  for (let i = 0; i < max; i += 1) {
    const imageUrl = imageMatches[i]?.[1]?.replace(/&amp;/g, '&') || ''
    const sourceText = stripTags(titleMatches[i]?.[1] || '')
    if (!imageUrl || !sourceText) continue
    candidates.push({ imageUrl, sourceText })
  }

  return candidates
}

function hasFormAndCountMatch(productName: string, sourceText: string): { ok: boolean; reason: string } {
  const normalized = sourceText.toLowerCase()
  const formAliases = inferFormAliases(productName)
  const countCandidates = inferCountCandidates(productName)

  if (formAliases.length === 0) {
    return { ok: false, reason: 'no-form-in-product-name' }
  }
  if (countCandidates.length === 0) {
    return { ok: false, reason: 'no-count-in-product-name' }
  }

  const formOk = formAliases.some((aliases) => aliases.some((alias) => normalized.includes(alias)))
  if (!formOk) {
    return { ok: false, reason: 'form-not-explicit-in-source-text' }
  }

  const countOk = countCandidates.some((count) => {
    const strict = new RegExp(`\\b${count}\\s*(count|ct|tablets?|caplets?|capsules?|softgels?|liquid gels?|pack|ea)\\b`, 'i')
    return strict.test(sourceText)
  })
  if (!countOk) {
    return { ok: false, reason: 'count-not-explicit-in-source-text' }
  }

  return { ok: true, reason: 'form-and-count-explicitly-matched' }
}

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
  const matches =
    html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.,%\-]+?\.(?:jpg|png)/g) || []
  const cleaned = [...new Set(matches.map((u) => u.replace(/&amp;/g, '&')))]
  const filtered = cleaned.filter((u) => !u.includes('sprite') && !u.includes('play-icon'))

  function score(url: string): number {
    const ul = url.match(/_UL(\d+)/i)
    if (ul) return Number(ul[1])
    const uy = url.match(/_UY(\d+)/i)
    if (uy) return Number(uy[1])
    const sr = url.match(/_SR(\d+),(\d+)/i)
    if (sr) return Math.max(Number(sr[1]), Number(sr[2]))
    return 0
  }

  filtered.sort((a, b) => score(b) - score(a))
  return filtered[0] || null
}

function normalizeAmazonUrl(url: string): string {
  return url.replace(/\._[^/]*_\.(jpg|png)$/i, '.$1')
}

async function checkHealth(url: string | null): Promise<Health> {
  if (!url) return { ok: false, reason: 'missing', size: 0 }

  if (url.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', url.replace(/^\//, ''))
    if (!fs.existsSync(localPath)) return { ok: false, reason: 'local-missing', size: 0 }
    const size = fs.statSync(localPath).size
    if (size < 30000) return { ok: false, reason: 'local-small', size }
    return { ok: true, reason: 'local-ok', size }
  }

  try {
    const head = await fetch(url, { method: 'HEAD' })
    if (!head.ok) return { ok: false, reason: `remote-${head.status}`, size: 0 }
    const ct = head.headers.get('content-type') || ''
    const len = Number(head.headers.get('content-length') || '0')
    if (!ct.startsWith('image/')) return { ok: false, reason: `remote-content-type-${ct}`, size: len }
    if (len > 0 && len < 20000) return { ok: false, reason: 'remote-small', size: len }
    return { ok: true, reason: 'remote-ok', size: len }
  } catch {
    return { ok: false, reason: 'remote-fetch-failed', size: 0 }
  }
}

async function searchAmazonImage(
  query: string,
  productName: string
): Promise<{ imageUrl: string; sourceText: string } | null> {
  const html = await httpGet(`https://www.amazon.com/s?k=${encodeURIComponent(query)}`)
  const candidates = extractAmazonCandidates(html)
    .map((c) => ({
      ...c,
      imageUrl: normalizeAmazonUrl(c.imageUrl),
      match: hasFormAndCountMatch(productName, c.sourceText),
    }))
    .filter((c) => c.match.ok)

  if (candidates.length === 0) return null

  function score(url: string): number {
    const ul = url.match(/_UL(\d+)/i)
    if (ul) return Number(ul[1])
    const uy = url.match(/_UY(\d+)/i)
    if (uy) return Number(uy[1])
    const sr = url.match(/_SR(\d+),(\d+)/i)
    if (sr) return Math.max(Number(sr[1]), Number(sr[2]))
    return 0
  }

  candidates.sort((a, b) => score(b.imageUrl) - score(a.imageUrl))
  return { imageUrl: candidates[0].imageUrl, sourceText: candidates[0].sourceText }
}

async function run() {
  const { data, error } = await supabase.from('products').select('id,name,sku,image_url').order('name')
  if (error || !data) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  const all = data as ProductRow[]
  const byUrl = new Map<string, ProductRow[]>()
  for (const p of all) {
    if (!p.image_url) continue
    if (!byUrl.has(p.image_url)) byUrl.set(p.image_url, [])
    byUrl.get(p.image_url)!.push(p)
  }

  const suspiciousUrl = new Set<string>()
  for (const [url, products] of byUrl.entries()) {
    if (products.length < 2) continue
    const tokenCount = new Set(products.map((p) => firstToken(p.name))).size
    if (tokenCount > 1) suspiciousUrl.add(url)
  }

  const source = limit ? all.slice(offset, offset + limit) : all.slice(offset)
  console.log(`Checking products: ${source.length} (offset=${offset}${limit ? `, limit=${limit}` : ''})`)

  let unchanged = 0
  let updated = 0
  let unresolved = 0
  const unresolvedItems: string[] = []

  for (let i = 0; i < source.length; i += 1) {
    const p = source[i]
    const beforeHealth = await checkHealth(p.image_url)
    const beforeUrl = p.image_url || '(null)'
    const isAmazon = typeof p.image_url === 'string' && p.image_url.includes('m.media-amazon.com/images/I/')
    const needsReview = !beforeHealth.ok || !isAmazon || (p.image_url ? suspiciousUrl.has(p.image_url) : false)

    console.log(`\n[${i + 1}/${source.length}] ${p.name}`)
    console.log(`BEFORE: ${beforeUrl}`)
    console.log(`BEFORE_HEALTH: ${beforeHealth.reason} (${beforeHealth.size})`)

    if (!needsReview) {
      unchanged += 1
      console.log('ACTION: keep (already healthy Amazon match)')
      continue
    }

    // 1) strict query
    let candidate = await searchAmazonImage(`"${p.name}"`, p.name)
    // 2) relaxed query
    if (!candidate) {
      candidate = await searchAmazonImage(cleanForSearch(p.name), p.name)
    }

    if (!candidate) {
      unresolved += 1
      unresolvedItems.push(`${p.name}: no Amazon match with explicit form+count`)
      console.log('ACTION: unresolved (no Amazon match)')
      continue
    }

    console.log(`MATCH_TEXT: ${candidate.sourceText}`)

    if (candidate.imageUrl === p.image_url) {
      unchanged += 1
      console.log('ACTION: keep (candidate equals current)')
      continue
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: candidate.imageUrl })
      .eq('id', p.id)

    if (updateError) {
      unresolved += 1
      unresolvedItems.push(`${p.name}: update failed (${updateError.message})`)
      console.log(`ACTION: unresolved (update failed: ${updateError.message})`)
      continue
    }

    const afterHealth = await checkHealth(candidate.imageUrl)
    if (!afterHealth.ok) {
      unresolved += 1
      unresolvedItems.push(`${p.name}: after check failed (${afterHealth.reason})`)
      console.log(`AFTER: ${candidate.imageUrl}`)
      console.log(`AFTER_HEALTH: ${afterHealth.reason} (${afterHealth.size})`)
      console.log('ACTION: unresolved (after check failed)')
      continue
    }

    updated += 1
    console.log(`AFTER: ${candidate.imageUrl}`)
    console.log(`AFTER_HEALTH: ${afterHealth.reason} (${afterHealth.size})`)
    console.log('ACTION: updated')
  }

  console.log('\n--- RESULT ---')
  console.log(`Total checked: ${source.length}`)
  console.log(`Updated: ${updated}`)
  console.log(`Unchanged: ${unchanged}`)
  console.log(`Unresolved: ${unresolved}`)
  if (unresolvedItems.length > 0) {
    unresolvedItems.forEach((x) => console.log(`- ${x}`))
  }
}

run()
