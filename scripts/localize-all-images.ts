import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = (() => {
  const arg = process.argv.find((a) => a.startsWith('--limit='))
  return arg ? Number(arg.split('=')[1]) : undefined
})()
const INCLUDE_PRODUCT_IMAGES_TABLE = !process.argv.includes('--skip-product-images')

const IMAGE_DIR = path.join(process.cwd(), 'public', 'product-images')
const FETCH_TIMEOUT_MS = 20000
const FETCH_RETRIES = 2

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

function firstHttpUrl(value: string): string | null {
  if (!value) return null
  const decoded = value
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('\\u0026', '&')
    .replaceAll('\\u003d', '=')
    .replaceAll('\\u003f', '?')
  const match = decoded.match(/https?:\/\/[^\s"'<>\\]+/i)
  return match ? match[0] : null
}

function isLocalPath(url: string): boolean {
  return url.startsWith('/')
}

function existsInPublic(localPath: string): boolean {
  const resolved = path.join(process.cwd(), 'public', localPath.replace(/^\//, ''))
  return fs.existsSync(resolved)
}

async function downloadToJpeg(url: string): Promise<Buffer> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      try {
        return await sharp(buffer)
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 86, mozjpeg: true })
          .toBuffer()
      } catch {
        return buffer
      }
    } catch (e) {
      lastErr = e
      if (attempt < FETCH_RETRIES) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
        continue
      }
      throw e
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

async function ensureLocalizedImage(params: {
  nameForSlug: string
  idForSuffix: string
  sourceUrl: string
}): Promise<string> {
  fs.mkdirSync(IMAGE_DIR, { recursive: true })
  const base = slugify(params.nameForSlug) || 'product-image'
  const suffix = params.idForSuffix.slice(0, 8).toLowerCase()
  const filename = `${base}-${suffix}.jpg`
  const destPath = path.join(IMAGE_DIR, filename)
  const publicUrl = `/product-images/${filename}`

  if (!DRY_RUN) {
    const jpeg = await downloadToJpeg(params.sourceUrl)
    fs.writeFileSync(destPath, jpeg)
  }

  return publicUrl
}

type ProductRow = {
  id: string
  name: string
  sku: string | null
  image_url: string | null
}

type ProductImageRow = {
  id: string
  product_id: string
  url: string
}

type ReportRow = {
  table: 'products' | 'product_images'
  id: string
  product_id?: string
  name?: string
  old_url: string
  new_url: string | null
  status: 'ok_local' | 'localized' | 'missing_local_file' | 'missing_url' | 'invalid_url' | 'failed'
  error?: string
}

async function localizeProducts(): Promise<ReportRow[]> {
  const report: ReportRow[] = []
  const { data, error } = await supabase
    .from('products')
    .select('id,name,sku,image_url')
    .order('name')

  if (error) throw new Error(`Failed to fetch products: ${error.message}`)

  const rows: ProductRow[] = (data as ProductRow[]) || []
  const target = LIMIT ? rows.slice(0, LIMIT) : rows

  for (let index = 0; index < target.length; index += 1) {
    const p = target[index]
    if (index % 25 === 0) {
      console.log(`[products] ${index}/${target.length}`)
    }
    const oldUrl = (p.image_url || '').trim()
    if (!oldUrl) {
      report.push({
        table: 'products',
        id: p.id,
        name: p.name,
        old_url: '',
        new_url: null,
        status: 'missing_url',
      })
      continue
    }

    if (isLocalPath(oldUrl)) {
      if (existsInPublic(oldUrl)) {
        report.push({
          table: 'products',
          id: p.id,
          name: p.name,
          old_url: oldUrl,
          new_url: oldUrl,
          status: 'ok_local',
        })
      } else {
        report.push({
          table: 'products',
          id: p.id,
          name: p.name,
          old_url: oldUrl,
          new_url: null,
          status: 'missing_local_file',
        })
      }
      continue
    }

    const sourceUrl = firstHttpUrl(oldUrl)
    if (!sourceUrl) {
      report.push({
        table: 'products',
        id: p.id,
        name: p.name,
        old_url: oldUrl,
        new_url: null,
        status: 'invalid_url',
      })
      continue
    }

    try {
      const localized = await ensureLocalizedImage({
        nameForSlug: p.name || p.sku || p.id,
        idForSuffix: p.id,
        sourceUrl,
      })

      if (!DRY_RUN) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({ image_url: localized })
          .eq('id', p.id)
        if (updateErr) throw new Error(updateErr.message)
      }

      report.push({
        table: 'products',
        id: p.id,
        name: p.name,
        old_url: oldUrl,
        new_url: localized,
        status: 'localized',
      })
    } catch (e) {
      report.push({
        table: 'products',
        id: p.id,
        name: p.name,
        old_url: oldUrl,
        new_url: null,
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return report
}

async function localizeProductImagesTable(): Promise<ReportRow[]> {
  const report: ReportRow[] = []
  const { data, error } = await supabase
    .from('product_images')
    .select('id,product_id,url')
    .order('product_id')

  if (error) throw new Error(`Failed to fetch product_images: ${error.message}`)

  const rows: ProductImageRow[] = (data as ProductImageRow[]) || []
  const target = LIMIT ? rows.slice(0, LIMIT) : rows

  for (let index = 0; index < target.length; index += 1) {
    const row = target[index]
    if (index % 100 === 0) {
      console.log(`[product_images] ${index}/${target.length}`)
    }
    const oldUrl = (row.url || '').trim()
    if (!oldUrl) {
      report.push({
        table: 'product_images',
        id: row.id,
        product_id: row.product_id,
        old_url: '',
        new_url: null,
        status: 'missing_url',
      })
      continue
    }

    if (isLocalPath(oldUrl)) {
      if (existsInPublic(oldUrl)) {
        report.push({
          table: 'product_images',
          id: row.id,
          product_id: row.product_id,
          old_url: oldUrl,
          new_url: oldUrl,
          status: 'ok_local',
        })
      } else {
        report.push({
          table: 'product_images',
          id: row.id,
          product_id: row.product_id,
          old_url: oldUrl,
          new_url: null,
          status: 'missing_local_file',
        })
      }
      continue
    }

    const sourceUrl = firstHttpUrl(oldUrl)
    if (!sourceUrl) {
      report.push({
        table: 'product_images',
        id: row.id,
        product_id: row.product_id,
        old_url: oldUrl,
        new_url: null,
        status: 'invalid_url',
      })
      continue
    }

    try {
      const localized = await ensureLocalizedImage({
        nameForSlug: `product-${row.product_id}`,
        idForSuffix: row.id,
        sourceUrl,
      })

      if (!DRY_RUN) {
        const { error: updateErr } = await supabase
          .from('product_images')
          .update({ url: localized })
          .eq('id', row.id)
        if (updateErr) throw new Error(updateErr.message)
      }

      report.push({
        table: 'product_images',
        id: row.id,
        product_id: row.product_id,
        old_url: oldUrl,
        new_url: localized,
        status: 'localized',
      })
    } catch (e) {
      report.push({
        table: 'product_images',
        id: row.id,
        product_id: row.product_id,
        old_url: oldUrl,
        new_url: null,
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return report
}

async function run() {
  console.log('IMAGE LOCALIZATION')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  if (LIMIT) console.log(`Limit: ${LIMIT}`)
  console.log('')

  const report: ReportRow[] = []

  const productReport = await localizeProducts()
  report.push(...productReport)

  if (INCLUDE_PRODUCT_IMAGES_TABLE) {
    const imageTableReport = await localizeProductImagesTable()
    report.push(...imageTableReport)
  }

  const summary = {
    timestamp: new Date().toISOString(),
    dry_run: DRY_RUN,
    limit: LIMIT ?? null,
    include_product_images_table: INCLUDE_PRODUCT_IMAGES_TABLE,
    totals: report.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {}),
  }

  const outPath = path.join(process.cwd(), 'image-localization-report.json')
  fs.writeFileSync(outPath, JSON.stringify({ summary, rows: report }, null, 2))

  console.log('Done.')
  console.log('Summary:', summary.totals)
  console.log(`Report saved: ${outPath}`)
}

run().catch((e) => {
  console.error('Failed:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})

