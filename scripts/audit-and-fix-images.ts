import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as https from 'https'
import * as http from 'http'
import { createClient } from '@supabase/supabase-js'
import Tesseract from 'tesseract.js'
import * as xlsx from 'xlsx'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const DRY_RUN = process.argv.includes('--dry-run')
const INCLUDE_LOCAL = process.argv.includes('--include-local')
const LOCALIZE = !process.argv.includes('--no-localize')
const LIMIT = (() => {
  const arg = process.argv.find(a => a.startsWith('--limit='))
  return arg ? Number(arg.split('=')[1]) : undefined
})()
const BRAND_FILTER = (() => {
  const arg = process.argv.find(a => a.startsWith('--brand='))
  return arg ? arg.split('=')[1] : undefined
})()
const EXCEL_PATH = (() => {
  const arg = process.argv.find(a => a.startsWith('--excel='))
  return arg ? arg.split('=')[1] : undefined
})()
const AFTER_NAME = (() => {
  const arg = process.argv.find(a => a.startsWith('--after='))
  return arg ? arg.split('=')[1] : undefined
})()

// Products listed here are protected from automatic image replacement.
// Keep these entries stable when rerunning the audit script.
const PROTECTED_PRODUCT_NAMES = new Set([
  'ACETAMINOPHEN TB 325MG 100 RS',
])

// ─── Product Name Parser ──────────────────────────────────────────

interface ParsedProduct {
  id: string
  name: string
  brand: string
  strength: string | null
  strengthNum: number | null
  form: string | null
  count: string | null
  countNum: number | null
  size: string | null
  isChildrens: boolean
  isInfant: boolean
  category: string
  imageUrl: string | null
  baseName: string | null
  variantSize: string | null
  description: string | null
}

const FORM_MAP: Record<string, string> = {
  TB: 'tablet', CP: 'capsule', GC: 'gelcap', LQGL: 'liquid gel',
  SFG: 'softgel', CW: 'chewable', SS: 'syrup', LQ: 'liquid',
  SL: 'solution', CR: 'cream', OI: 'ointment', GL: 'gel',
  LT: 'lotion', SP: 'spray', SN: 'nasal spray', DR: 'drops',
  AE: 'aerosol', MW: 'mouthwash', PW: 'powder', SU: 'suppository',
  EN: 'enema', PA: 'pads', AP: 'adhesive pads', DS: 'dressing',
  BR: 'bar', ST: 'stick', KT: 'kit', PC: 'pack',
}

function parseProductName(raw: any): ParsedProduct {
  const name: string = raw.name || ''
  const upper = name.toUpperCase()

  // Extract brand
  const brand = (raw.brand || name.split(' ')[0]).toUpperCase()

  // Extract strength (e.g., 200MG, 0.05%, 325MG, 160MG/5ML)
  const strengthMatch = upper.match(/(\d+(?:\.\d+)?(?:MG|MCG|%|MG\/\d+ML))/i)
  const strength = strengthMatch ? strengthMatch[1] : null
  const strengthNum = strength ? parseFloat(strength) : null

  // Extract form
  let form: string | null = null
  for (const [abbrev, full] of Object.entries(FORM_MAP)) {
    const re = new RegExp(`\\b${abbrev}\\b`, 'i')
    if (re.test(upper)) {
      form = full
      break
    }
  }

  // Extract count (e.g., 24, 100, 40, 50)
  // Look for standalone numbers that are likely counts (not part of strength)
  const countMatch = upper.match(/\b(\d{1,4})\s*(?:CT|COUNT|PACK|PK|EA)?\s*$/i)
    || upper.match(/\b(\d{1,4})\b(?!\s*(?:MG|MCG|ML|%|GM|OZ|N|X|IN|HR|\/))/)
  let count: string | null = null
  let countNum: number | null = null
  if (countMatch) {
    const cand = parseInt(countMatch[1])
    if (cand > 0 && cand <= 5000 && countMatch[1] !== strength?.replace(/\D/g, '')) {
      count = countMatch[1]
      countNum = cand
    }
  }

  // Extract size (e.g., 113GM, 454GM, 30ML, 15ML)
  const sizeMatch = upper.match(/(\d+(?:\.\d+)?)\s*(GM|ML|OZ|FL\s?OZ|L|GAL)/i)
  const size = sizeMatch ? `${sizeMatch[1]}${sizeMatch[2]}` : null

  // Children's / Infant detection
  const isChildrens = /\bCHD\b|\bCHILD/i.test(upper) || /children/i.test(raw.description || '')
  const isInfant = /\bINFT?\b|\bINFANT/i.test(upper)

  return {
    id: raw.id,
    name,
    brand,
    strength,
    strengthNum,
    form,
    count,
    countNum,
    size,
    isChildrens,
    isInfant,
    category: raw.category || '',
    imageUrl: raw.image_url,
    baseName: raw.base_product_name,
    variantSize: raw.variant_size,
    description: raw.description,
  }
}

// ─── Image Download ───────────────────────────────────────────────

function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const ws = fs.createWriteStream(dest)
      res.pipe(ws)
      ws.on('finish', () => ws.close(() => resolve()))
      ws.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

// ─── OCR ──────────────────────────────────────────────────────────

let ocrWorker: Tesseract.Worker | null = null

async function initOCR() {
  ocrWorker = await Tesseract.createWorker('eng')
}

async function ocrImage(imagePath: string): Promise<string> {
  if (!ocrWorker) await initOCR()
  const { data: { text } } = await ocrWorker!.recognize(imagePath)
  return text.toUpperCase()
}

async function shutdownOCR() {
  if (ocrWorker) {
    await ocrWorker.terminate()
    ocrWorker = null
  }
}

// ─── Mismatch Detection ──────────────────────────────────────────

interface MismatchResult {
  hasMismatch: boolean
  reasons: string[]
  ocrText: string
}

function detectMismatch(parsed: ParsedProduct, ocrText: string): MismatchResult {
  const reasons: string[] = []
  const text = ocrText.toUpperCase()

  if (text.length < 10) {
    return { hasMismatch: false, reasons: ['OCR returned too little text to verify'], ocrText }
  }

  // 1. Brand mismatch
  // Skip generic/ingredient names that aren't real brands
  const genericNames = new Set([
    'ABDOMINAL', 'ACETAMINOPHEN', 'ACETAMIN', 'ALCOHOL', 'ALLERGY', 'ANTACID',
    'ANTIBIOTIC', 'ASPIRIN', 'ATROPINE', 'BACITRACIN', 'BACITRAYCIN', 'BENZOCAINE',
    'CALAMINE', 'CALCIUM', 'CARBAMIDE', 'CASTOR', 'CHARCOAL', 'CHEST', 'COLD',
    'CONDOM', 'COTTON', 'COUGH', 'DECONGEST', 'DENTURE', 'DIABETIC', 'DOCUSATE',
    'DOUCHE', 'ELASTIC', 'EPSOM', 'FIBER', 'FIRST', 'FLOSS', 'FOAM', 'FOOT',
    'GAS', 'GAUZE', 'GLOVES', 'GLYCERIN', 'HYDROCORTISONE', 'HYDROGEN', 'IBUPROFEN',
    'INSOLE', 'IRON', 'LANCETS', 'LAXATIVE', 'LICE', 'LIP', 'LUBRICANT', 'MAGNESIUM',
    'MELATONIN', 'MICONAZOLE', 'MINERAL', 'NAPROXEN', 'NASAL', 'NICOTINE', 'NSL',
    'OMEGA', 'ORAL', 'PAIN', 'PETROLEUM', 'PRENATAL', 'PROBIOTIC', 'SALINE',
    'SLEEP', 'SODIUM', 'STOOL', 'SUNSCREEN', 'SUPPOSITORY', 'SYRINGE', 'TEST',
    'THERMOMETER', 'TOILET', 'TOPICAL', 'TRIPLE', 'TUBING', 'UNDERPADS', 'VAPORIZER',
    'VITAMIN', 'WART', 'WITCH', 'WOUND', 'ZINC',
  ])
  const brandWords = parsed.brand.split(/[-\s]/).filter(w => w.length >= 3)
  const isGenericBrand = genericNames.has(parsed.brand)
  const brandFound = brandWords.some(w => text.includes(w))
  if (!isGenericBrand && !brandFound && brandWords.length > 0 && brandWords[0].length >= 4) {
    const brandAliases: Record<string, string[]> = {
      'TYLENOL': ['TYLENOL', 'MCNEIL'],
      'ADVIL': ['ADVIL', 'PFIZER'],
      'MOTRIN': ['MOTRIN', 'JOHNSON'],
      'MUCINEX': ['MUCINEX', 'RECKITT'],
      'NEOSPORIN': ['NEOSPORIN', 'JOHNSON'],
      'BENADRYL': ['BENADRYL', 'JOHNSON'],
      'PEPTO': ['PEPTO', 'BISMOL'],
      'CORTIZONE': ['CORTIZONE', 'CHATTEM'],
      'COPPERTONE': ['COPPERTONE', 'BEIERSDORF'],
      'EUCERIN': ['EUCERIN', 'BEIERSDORF'],
      'ACCU': ['ACCU-CHEK', 'ACCU', 'ROCHE'],
    }
    const aliases = brandAliases[parsed.brand] || []
    const aliasFound = aliases.some(a => text.includes(a))
    if (!aliasFound) {
      reasons.push(`Brand mismatch: expected "${parsed.brand}" not found in image text`)
    }
  }

  // 2. Strength mismatch
  if (parsed.strength && parsed.strengthNum) {
    const strVal = parsed.strengthNum.toString()
    const mgPattern = new RegExp(`${strVal}\\s*(?:MG|MCG|%)`, 'i')
    if (!mgPattern.test(text) && !text.includes(strVal)) {
      // Check if a DIFFERENT strength is visible
      const otherStrength = text.match(/(\d+)\s*MG/i)
      if (otherStrength && otherStrength[1] !== strVal) {
        reasons.push(`Strength mismatch: expected ${parsed.strength}, image shows ${otherStrength[1]}MG`)
      }
    }
  }

  // 3. Count mismatch
  if (parsed.countNum && parsed.countNum >= 10) {
    const countStr = parsed.countNum.toString()
    const countInImage = text.includes(countStr)
    if (!countInImage) {
      const otherCount = text.match(/(\d{2,4})\s*(?:CT|COUNT|TABLET|CAPSULE|CAPLET|GELCAP)/i)
      if (otherCount && otherCount[1] !== countStr) {
        reasons.push(`Count mismatch: expected ${countStr}, image shows ${otherCount[1]}`)
      }
    }
  }

  // 4. Form mismatch
  if (parsed.form) {
    const formKeywords: Record<string, string[]> = {
      'tablet': ['TABLET', 'CAPLET', 'TAB'],
      'capsule': ['CAPSULE', 'CAPS'],
      'gelcap': ['GELCAP', 'GEL CAP', 'LIQUID GEL'],
      'liquid gel': ['LIQUID GEL', 'LIQUIGEL', 'GELCAP'],
      'liquid': ['LIQUID', 'SYRUP', 'ORAL SOLUTION', 'SUSPENSION'],
      'syrup': ['SYRUP', 'LIQUID', 'ORAL SUSPENSION', 'SUSPENSION'],
      'cream': ['CREAM', 'CRM'],
      'ointment': ['OINTMENT', 'OINT'],
      'gel': ['GEL'],
      'drops': ['DROP', 'OPHTHALMIC'],
      'nasal spray': ['NASAL', 'SPRAY'],
      'spray': ['SPRAY', 'MIST'],
      'suppository': ['SUPPOSITORY', 'SUPP'],
      'chewable': ['CHEWABLE', 'CHEW'],
      'powder': ['POWDER', 'PWDR'],
    }
    const expected = formKeywords[parsed.form] || [parsed.form.toUpperCase()]
    const formInImage = expected.some(kw => text.includes(kw))
    if (!formInImage) {
      // Check if a conflicting form is visible
      for (const [formName, keywords] of Object.entries(formKeywords)) {
        if (formName !== parsed.form && keywords.some(kw => text.includes(kw))) {
          reasons.push(`Form mismatch: expected "${parsed.form}", image shows "${formName}"`)
          break
        }
      }
    }
  }

  // 5. Children's vs Adult
  const imageIsChildrens = /CHILDREN|CHILD|KIDS|PEDIATRIC|INFANT/i.test(text)
  if (parsed.isChildrens && !imageIsChildrens && text.length > 30) {
    const imageIsAdult = /ADULT|EXTRA STRENGTH|MAXIMUM STRENGTH/i.test(text)
    if (imageIsAdult) {
      reasons.push("Children's product but image shows adult version")
    }
  }
  if (!parsed.isChildrens && !parsed.isInfant && imageIsChildrens) {
    reasons.push("Adult product but image shows children's version")
  }

  // 6. Infant vs Children's
  if (parsed.isInfant && !(/INFANT/i.test(text)) && imageIsChildrens) {
    reasons.push("Infant product but image shows children's (not infant) version")
  }

  return {
    hasMismatch: reasons.length > 0,
    reasons,
    ocrText: text.substring(0, 200),
  }
}

// ─── Duplicate Image Detection (no OCR needed) ───────────────────

interface DuplicateIssue {
  product: ParsedProduct
  reason: string
}

function findDuplicateImageIssues(products: ParsedProduct[]): DuplicateIssue[] {
  const issues: DuplicateIssue[] = []
  const urlGroups: Record<string, ParsedProduct[]> = {}

  for (const p of products) {
    if (!p.imageUrl) continue
    const url = p.imageUrl
    if (!urlGroups[url]) urlGroups[url] = []
    urlGroups[url].push(p)
  }

  for (const [url, group] of Object.entries(urlGroups)) {
    if (group.length <= 1) continue

    // Check if shared image is acceptable (same base product, different size)
    const bases = new Set(group.map(p => p.baseName || p.name))
    if (bases.size === 1) continue // Same base product - might be OK

    // Different base products sharing same image
    const brands = new Set(group.map(p => p.brand))
    if (brands.size > 1) {
      for (const p of group) {
        issues.push({
          product: p,
          reason: `Shares image with different-brand products: ${group.filter(g => g.id !== p.id).map(g => g.name).join(', ')}`,
        })
      }
    }

    // Same brand but different forms/strengths sharing image
    const strengths = new Set(group.map(p => p.strength).filter(Boolean))
    const forms = new Set(group.map(p => p.form).filter(Boolean))
    if (strengths.size > 1 || forms.size > 1) {
      for (const p of group) {
        issues.push({
          product: p,
          reason: `Shares image with different strength/form variants: ${group.filter(g => g.id !== p.id).map(g => g.name).join(', ')}`,
        })
      }
    }
  }

  return issues
}

// ─── Image Search ─────────────────────────────────────────────────

function cleanForSearch(name: string): string {
  return name
    .replace(/#\d+/g, '')
    .replace(/\b\d+(\.\d+)?%\b/g, '')
    .replace(/\b(TB|CP|GC|LQ|CR|OI|SN|DR|SS|MW|SP|AR|GL|EN|LT|PA|PD|ST|KT|BR|PC|AE|SU|FC|SL|PW|CW|AP|DS|EA|MS|ND|RS|EC|IR|ER)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeName(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function loadExcelDescriptions(excelPath: string): string[] {
  const workbook = xlsx.readFile(excelPath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' })
  const descriptions = rows
    .slice(1)
    .map((row) => String(row.__EMPTY_1 || '').trim())
    .filter(Boolean)
  return descriptions
}

function resolveExcelAfterList(excelPath: string, afterName: string | undefined): string[] {
  const descriptions = loadExcelDescriptions(excelPath)
  if (!afterName) return descriptions
  const target = normalizeName(afterName)
  const normalized = descriptions.map(normalizeName)
  let idx = normalized.findIndex((name) => name === target)
  if (idx === -1) {
    idx = normalized.findIndex((name) => name.includes(target) || target.includes(name))
  }
  if (idx === -1) return []
  return descriptions.slice(idx + 1)
}

function buildSearchQuery(parsed: ParsedProduct): string {
  const parts: string[] = []
  const brandName = parsed.brand.replace(/-/g, ' ')
  parts.push(brandName)

  // Add key product identifiers
  const nameWithoutBrand = parsed.name.replace(new RegExp(`^${parsed.brand}\\b\\s*`, 'i'), '')
  const cleaned = cleanForSearch(nameWithoutBrand)
  if (cleaned) parts.push(cleaned)

  if (parsed.strength) parts.push(parsed.strength)
  if (parsed.form) parts.push(parsed.form)
  if (parsed.countNum) parts.push(`${parsed.countNum} count`)
  if (parsed.isChildrens) parts.push("children's")
  if (parsed.isInfant) parts.push("infant")

  return parts.join(' ').substring(0, 120)
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

async function searchProductImage(parsed: ParsedProduct): Promise<string | null> {
  const query = buildSearchQuery(parsed)

  // Try Google Images first
  try {
    const googleUrl = `https://www.google.com/search?udm=2&q=${encodeURIComponent(query)}`
    const html = await httpsGet(googleUrl)
    const gstaticMatch = html.match(/https:\/\/encrypted-tbn0\.gstatic\.com\/[^\"]+/)
    if (gstaticMatch) {
      return gstaticMatch[0]
        .replace(/\\u003d/g, '=')
        .replace(/\\u0026/g, '&')
        .replace(/\\u003f/g, '?')
    }
  } catch {}

  return null
}

// ─── Check if URL is broken ──────────────────────────────────────

function checkImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || url.startsWith('/')) { resolve(true); return }
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    }, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400)
      res.destroy()
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
}

// ─── Report ───────────────────────────────────────────────────────

interface ReportEntry {
  product_id: string
  product_name: string
  old_image_url: string
  new_image_url: string | null
  reason: string
  status: 'replaced' | 'flagged' | 'skipped' | 'broken_url'
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70))
  console.log('  PRODUCT IMAGE AUDIT & FIX')
  console.log('='.repeat(70))
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update DB)'}`)
  if (LIMIT) console.log(`  Limit: ${LIMIT} products`)
  if (BRAND_FILTER) console.log(`  Brand filter: ${BRAND_FILTER}`)
  if (EXCEL_PATH) console.log(`  Excel filter: ${EXCEL_PATH}`)
  if (AFTER_NAME) console.log(`  After name: ${AFTER_NAME}`)
  if (INCLUDE_LOCAL) console.log('  Local images: included in OCR')
  if (LOCALIZE) console.log('  Replacements: saved to local /public/product-images')
  console.log('='.repeat(70) + '\n')

  // 1. Fetch all products
  let query = supabase.from('products').select('*').order('name')
  if (BRAND_FILTER) query = query.ilike('brand', `%${BRAND_FILTER}%`)
  const { data: rawProducts, error } = await query

  if (error || !rawProducts) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  let products = rawProducts.map(parseProductName)
  if (LIMIT) products = products.slice(0, LIMIT)

  if (EXCEL_PATH) {
    const afterList = resolveExcelAfterList(EXCEL_PATH, AFTER_NAME)
    if (afterList.length === 0) {
      console.log('⚠️  Excel filter produced 0 items. Check --after value.\n')
      products = []
    } else {
      const allowSet = new Set(afterList.map(normalizeName))
      const beforeCount = products.length
      products = products.filter(p => allowSet.has(normalizeName(p.name)))
      const matchedSet = new Set(products.map(p => normalizeName(p.name)))
      const missing = afterList.filter(name => !matchedSet.has(normalizeName(name)))
      console.log(`Excel list items after marker: ${afterList.length}`)
      console.log(`Matched products in DB: ${products.length} (from ${beforeCount})`)
      if (missing.length) {
        console.log(`Missing from DB: ${missing.length}`)
        console.log(missing.map(m => `  - ${m}`).join('\n'))
      }
      console.log('')
    }
  }

  console.log(`Loaded ${products.length} products\n`)

  // 2. Phase 1: Find duplicate image issues (fast, no downloads)
  console.log('─'.repeat(70))
  console.log('PHASE 1: Duplicate Image Detection')
  console.log('─'.repeat(70) + '\n')

  const dupeIssues = findDuplicateImageIssues(products)
  const dupeProductIds = new Set(dupeIssues.map(d => d.product.id))
  console.log(`Found ${dupeIssues.length} products sharing potentially wrong images\n`)
  for (const issue of dupeIssues) {
    console.log(`  ⚠️  ${issue.product.name}`)
    console.log(`     ${issue.reason}\n`)
  }

  // 3. Phase 2: Check for broken URLs
  console.log('─'.repeat(70))
  console.log('PHASE 2: Broken URL Check')
  console.log('─'.repeat(70) + '\n')

  const brokenUrls: ParsedProduct[] = []
  const batchSize = 10
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async (p) => {
      if (!p.imageUrl || p.imageUrl.startsWith('/')) return true
      return checkImageUrl(p.imageUrl)
    }))
    for (let j = 0; j < batch.length; j++) {
      if (!results[j]) {
        brokenUrls.push(batch[j])
        console.log(`  ❌ BROKEN: ${batch[j].name} → ${batch[j].imageUrl?.substring(0, 60)}...`)
      }
    }
    if (i % 50 === 0 && i > 0) {
      console.log(`  Checked ${i}/${products.length} URLs...`)
    }
  }
  console.log(`\nFound ${brokenUrls.length} broken image URLs\n`)

  // 4. Phase 3: OCR-based verification on flagged products
  console.log('─'.repeat(70))
  console.log('PHASE 3: OCR Image Verification')
  console.log('─'.repeat(70) + '\n')

  // Prioritize: duplicate-flagged products, then all others
  const flaggedIds = new Set(Array.from(dupeProductIds).concat(brokenUrls.map(b => b.id)))
  const priorityProducts = products.filter(p => flaggedIds.has(p.id))
  const remainingProducts = products.filter(p => !flaggedIds.has(p.id))
  const ocrQueue = [...priorityProducts, ...remainingProducts]

  await initOCR()

  const report: ReportEntry[] = []
  const tmpDir = path.join(os.tmpdir(), 'product-image-audit')
  fs.mkdirSync(tmpDir, { recursive: true })

  let processed = 0
  let mismatches = 0
  let replaced = 0
  let ocrFailed = 0

  for (const product of ocrQueue) {
    processed++
    const pctDone = ((processed / ocrQueue.length) * 100).toFixed(1)

    if (PROTECTED_PRODUCT_NAMES.has(product.name.toUpperCase())) {
      report.push({
        product_id: product.id,
        product_name: product.name,
        old_image_url: product.imageUrl || '',
        new_image_url: product.imageUrl,
        reason: 'Protected product: skipped from auto-replacement',
        status: 'skipped',
      })
      continue
    }

    if (!product.imageUrl) continue

    const isLocalImage = product.imageUrl.startsWith('/')
    if (isLocalImage && !INCLUDE_LOCAL) {
      continue
    }

    const ext = '.jpg'
    const localImagePath = isLocalImage
      ? path.join(process.cwd(), 'public', product.imageUrl)
      : null
    const tmpFile = isLocalImage ? (localImagePath as string) : path.join(tmpDir, `${product.id}${ext}`)

    try {
      // Download (skip if local)
      if (!isLocalImage) {
        await downloadImage(product.imageUrl, tmpFile)
      } else if (!fs.existsSync(tmpFile)) {
        throw new Error(`Local image not found at ${tmpFile}`)
      }

      // OCR
      const ocrText = await ocrImage(tmpFile)

      // Detect mismatch
      const result = detectMismatch(product, ocrText)

      if (result.hasMismatch) {
        mismatches++
        console.log(`\n[${pctDone}%] ⚠️  MISMATCH: ${product.name}`)
        for (const reason of result.reasons) {
          console.log(`     → ${reason}`)
        }

        // Safety rule: do not auto-replace on brand-only OCR misses.
        // OCR often misses logos/brand text, which can cause false positives.
        const isBrandOnlyMismatch = result.reasons.every((reason) =>
          reason.startsWith('Brand mismatch')
        )
        if (isBrandOnlyMismatch) {
          console.log('     ⚠️  Brand-only mismatch: flagged for manual review (no auto-replace)')
          report.push({
            product_id: product.id,
            product_name: product.name,
            old_image_url: product.imageUrl,
            new_image_url: null,
            reason: `${result.reasons.join('; ')}; auto-replace skipped (brand-only rule)`,
            status: 'flagged',
          })
          continue
        }

        // Search for correct image
        console.log(`     🔍 Searching for correct image...`)
        const newUrl = await searchProductImage(product)
        let replacementUrl = newUrl
        if (newUrl && LOCALIZE) {
          const slug = slugifyName(`${product.name}-${product.id.slice(0, 6)}`)
          const filename = `${slug}.jpg`
          const destPath = path.join(process.cwd(), 'public', 'product-images', filename)
          await downloadImage(newUrl, destPath)
          replacementUrl = `/product-images/${filename}`
        }

        if (replacementUrl && replacementUrl !== product.imageUrl) {
          if (!DRY_RUN) {
            const { error: updateErr } = await supabase
              .from('products')
              .update({ image_url: replacementUrl })
              .eq('id', product.id)

            if (!updateErr) {
              replaced++
              console.log(`     ✅ REPLACED: ${replacementUrl.substring(0, 70)}...`)
              report.push({
                product_id: product.id,
                product_name: product.name,
                old_image_url: product.imageUrl,
                new_image_url: replacementUrl,
                reason: result.reasons.join('; '),
                status: 'replaced',
              })
            } else {
              console.log(`     ❌ DB update failed: ${updateErr.message}`)
              report.push({
                product_id: product.id,
                product_name: product.name,
                old_image_url: product.imageUrl,
                new_image_url: replacementUrl,
                reason: result.reasons.join('; '),
                status: 'flagged',
              })
            }
          } else {
            console.log(`     [DRY RUN] Would replace with: ${replacementUrl.substring(0, 70)}...`)
            report.push({
              product_id: product.id,
              product_name: product.name,
              old_image_url: product.imageUrl,
              new_image_url: replacementUrl,
              reason: result.reasons.join('; '),
              status: 'flagged',
            })
          }
        } else {
          console.log(`     ⚠️  No better image found, flagging for manual review`)
          report.push({
            product_id: product.id,
            product_name: product.name,
            old_image_url: product.imageUrl,
            new_image_url: null,
            reason: result.reasons.join('; '),
            status: 'flagged',
          })
        }

        // Rate limit searches
        await new Promise(r => setTimeout(r, 2000))
      } else {
        if (processed % 25 === 0) {
          console.log(`[${pctDone}%] ✅ ${product.name} — image OK`)
        }
      }
    } catch (err) {
      ocrFailed++
      if (brokenUrls.find(b => b.id === product.id)) {
        console.log(`\n[${pctDone}%] ❌ BROKEN URL: ${product.name}`)
        console.log(`     🔍 Searching for replacement...`)
        const newUrl = await searchProductImage(product)
        let replacementUrl = newUrl
        if (newUrl && LOCALIZE) {
          const slug = slugifyName(`${product.name}-${product.id.slice(0, 6)}`)
          const filename = `${slug}.jpg`
          const destPath = path.join(process.cwd(), 'public', 'product-images', filename)
          await downloadImage(newUrl, destPath)
          replacementUrl = `/product-images/${filename}`
        }
        if (replacementUrl) {
          if (!DRY_RUN) {
            await supabase.from('products').update({ image_url: replacementUrl }).eq('id', product.id)
            replaced++
            console.log(`     ✅ REPLACED broken URL: ${replacementUrl.substring(0, 70)}...`)
          }
          report.push({
            product_id: product.id,
            product_name: product.name,
            old_image_url: product.imageUrl,
            new_image_url: replacementUrl,
            reason: 'Broken image URL',
            status: DRY_RUN ? 'flagged' : 'replaced',
          })
        } else {
          report.push({
            product_id: product.id,
            product_name: product.name,
            old_image_url: product.imageUrl,
            new_image_url: null,
            reason: 'Broken image URL — no replacement found',
            status: 'broken_url',
          })
        }
        await new Promise(r => setTimeout(r, 2000))
      }
    } finally {
      // Clean up temp file
      if (!isLocalImage && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    }
  }

  await shutdownOCR()

  // 5. Generate Report
  console.log('\n' + '='.repeat(70))
  console.log('  AUDIT REPORT')
  console.log('='.repeat(70) + '\n')

  console.log(`Total products scanned:    ${processed}`)
  console.log(`Mismatches detected:       ${mismatches}`)
  console.log(`Images replaced:           ${replaced}`)
  console.log(`OCR failures:              ${ocrFailed}`)
  console.log(`Broken URLs:               ${brokenUrls.length}`)
  console.log(`Duplicate image groups:    ${dupeIssues.length}`)
  console.log()

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'image-audit-report.json')
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'live',
    summary: {
      total_scanned: processed,
      mismatches: mismatches,
      replaced: replaced,
      ocr_failures: ocrFailed,
      broken_urls: brokenUrls.length,
      duplicate_image_groups: dupeIssues.length,
    },
    changes: report,
    duplicate_issues: dupeIssues.map(d => ({
      product_id: d.product.id,
      product_name: d.product.name,
      reason: d.reason,
    })),
  }, null, 2))

  console.log(`Full report saved to: ${reportPath}`)

  // Also save a CSV for easy viewing
  const csvPath = path.join(process.cwd(), 'image-audit-report.csv')
  const csvHeader = 'product_id,product_name,old_image_url,new_image_url,reason,status'
  const csvRows = report.map(r =>
    `"${r.product_id}","${r.product_name.replace(/"/g, '""')}","${r.old_image_url}","${r.new_image_url || ''}","${r.reason.replace(/"/g, '""')}","${r.status}"`
  )
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'))
  console.log(`CSV report saved to:  ${csvPath}`)

  console.log('\n' + '='.repeat(70))
  console.log('  AUDIT COMPLETE')
  console.log('='.repeat(70))
}

main().catch(console.error)
