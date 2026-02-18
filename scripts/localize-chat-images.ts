import fs from 'fs'
import path from 'path'
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

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = (() => {
  const arg = process.argv.find((a) => a.startsWith('--limit='))
  return arg ? Number(arg.split('=')[1]) : undefined
})()

const DEFAULT_TRANSCRIPT_DIR =
  process.env.TRANSCRIPT_DIR ||
  path.join(
    process.env.HOME || '',
    '.cursor/projects/Users-kaykovmedia-Downloads-webs-web-cha/agent-transcripts'
  )

const TRANSCRIPT_PATH = process.env.TRANSCRIPT_PATH
const TRANSCRIPT_PATHS = process.env.TRANSCRIPT_PATHS

const IMAGE_DIR = path.join(process.cwd(), 'public', 'product-images')

const SKIP_URL_PATTERNS = ['example.com', 'via.placeholder.com', 'localhost']

function shouldSkipUrl(url: string): boolean {
  return SKIP_URL_PATTERNS.some((pattern) => url.includes(pattern))
}

function isLikelyUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
}

type Update = { key: string; url: string; type: 'name' | 'id'; order: number }

function pushUpdate(updates: Update[], type: Update['type'], key: string, url: string, order: number) {
  if (!key || !url) return
  if (key === 'ID') return
  if (key === 'NAME') return
  if (url === 'URL') return
  if (!isLikelyUrl(url)) return
  if (shouldSkipUrl(url)) return
  updates.push({ type, key, url, order })
}

function parsePayload(payload: string, order: number): Update[] {
  const updates: Update[] = []
  const patterns: Array<{ regex: RegExp; map: (m: RegExpMatchArray) => Update | null }> = [
    {
      regex: /update-product-image\.ts\s+"([^"]+)"\s+"([^"]+)"/g,
      map: (m) => ({ type: 'name', key: m[1].trim(), url: m[2].trim(), order }),
    },
    {
      regex: /update\(\{\s*image_url:\s*'([^']+)'\s*\}\)\.eq\('name','([^']+)'\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim(), order }),
    },
    {
      regex: /update\(\{\s*image_url:\s*"([^"]+)"\s*\}\)\.eq\("name","([^"]+)"\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim(), order }),
    },
    {
      regex: /update\(\{\s*image_url:\s*'([^']+)'\s*\}\)\.eq\('id','([^']+)'\)/g,
      map: (m) => ({ type: 'id', key: m[2].trim(), url: m[1].trim(), order }),
    },
    {
      regex: /name:\s*'([^']+)'\s*,\s*image_url:\s*'([^']+)'/g,
      map: (m) => ({ type: 'name', key: m[1].trim(), url: m[2].trim(), order }),
    },
    {
      regex: /const image='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*image[^}]*\}\)\.eq\('id','([^']+)'\)/g,
      map: (m) => ({ type: 'id', key: m[2].trim(), url: m[1].trim(), order }),
    },
    {
      regex: /const image='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*image[^}]*\}\)\.eq\('name','([^']+)'\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim(), order }),
    },
    {
      regex: /const name='([^']+)';[\s\S]*?const image='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*image[^}]*\}\)\.eq\('name',name\)/g,
      map: (m) => ({ type: 'name', key: m[1].trim(), url: m[2].trim(), order }),
    },
    {
      regex: /const url='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*url[^}]*\}\)\.eq\('name','([^']+)'\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim(), order }),
    },
  ]

  for (const { regex, map } of patterns) {
    for (const match of payload.matchAll(regex)) {
      const update = map(match)
      if (update) updates.push(update)
    }
  }

  if (payload.includes('update({image_url') || payload.includes('update({ image_url')) {
    const tuplePairs = /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g
    for (const match of payload.matchAll(tuplePairs)) {
      updates.push({
        type: 'name',
        key: match[1].trim(),
        url: match[2].trim(),
        order,
      })
    }
  }

  return updates
}

function parseTranscript(content: string, order: number): Update[] {
  const updates: Update[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.includes('command:')) continue

    const command = line.split('command:')[1]?.trim() || ''
    if (command.includes("node - <<'NODE'")) {
      let payload = ''
      i += 1
      while (i < lines.length && lines[i].trim() !== 'NODE') {
        payload += `${lines[i]}\n`
        i += 1
      }
      parsePayload(payload, order).forEach((u) => pushUpdate(updates, u.type, u.key, u.url, order))
      continue
    }

    parsePayload(command, order).forEach((u) => pushUpdate(updates, u.type, u.key, u.url, order))
  }

  return updates
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

function extensionFromUrl(url: string): string | null {
  const clean = url.split('?')[0]?.split('#')[0] || ''
  const ext = path.extname(clean).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
    return ext === '.jpeg' ? '.jpg' : ext
  }
  return null
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  if (contentType.includes('image/jpeg')) return '.jpg'
  if (contentType.includes('image/png')) return '.png'
  if (contentType.includes('image/webp')) return '.webp'
  if (contentType.includes('image/gif')) return '.gif'
  if (contentType.includes('image/svg+xml')) return '.svg'
  return null
}

async function fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }
  const contentType = response.headers.get('content-type')
  const arrayBuffer = await response.arrayBuffer()
  return { buffer: Buffer.from(arrayBuffer), contentType }
}

function ensureUniqueFilename(base: string, ext: string): string {
  let candidate = `${base}${ext}`
  let counter = 2
  while (fs.existsSync(path.join(IMAGE_DIR, candidate))) {
    candidate = `${base}-${counter}${ext}`
    counter += 1
  }
  return candidate
}

function getTranscriptPaths(): string[] {
  if (TRANSCRIPT_PATHS) {
    return TRANSCRIPT_PATHS.split(',').map((p) => p.trim()).filter(Boolean)
  }
  if (TRANSCRIPT_PATH) {
    return [TRANSCRIPT_PATH]
  }
  if (!fs.existsSync(DEFAULT_TRANSCRIPT_DIR)) {
    console.error(`Transcript directory not found: ${DEFAULT_TRANSCRIPT_DIR}`)
    process.exit(1)
  }
  return fs
    .readdirSync(DEFAULT_TRANSCRIPT_DIR)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => path.join(DEFAULT_TRANSCRIPT_DIR, f))
}

async function loadUpdates(): Promise<Update[]> {
  const paths = getTranscriptPaths()
  const withStats = paths.map((p) => ({ path: p, mtime: fs.statSync(p).mtimeMs }))
  withStats.sort((a, b) => a.mtime - b.mtime)

  let order = 0
  const updates: Update[] = []
  for (const entry of withStats) {
    const content = fs.readFileSync(entry.path, 'utf8')
    updates.push(...parseTranscript(content, order))
    order += 1
  }

  const applied = new Map<string, Update>()
  for (const u of updates) {
    const key = `${u.type}:${u.key}`
    applied.set(key, u)
  }

  const finalUpdates = [...applied.values()]
  finalUpdates.sort((a, b) => a.order - b.order)
  return finalUpdates
}

async function resolveProduct(update: Update) {
  if (update.type === 'id') {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, image_url')
      .eq('id', update.key)
      .single()
    if (error || !data) return null
    return data
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('name', update.key)
    .single()
  if (error || !data) return null
  return data
}

async function localizeUpdate(update: Update) {
  const product = await resolveProduct(update)
  if (!product) {
    return { status: 'missing', message: `Product not found for ${update.type}:${update.key}` }
  }

  const originalUrl = update.url.trim()
  if (!isLikelyUrl(originalUrl)) {
    return { status: 'skipped', message: `Invalid URL for ${product.name}` }
  }

  const downloadAndSave = async (sourceUrl: string) => {
    const { buffer, contentType } = await fetchImage(sourceUrl)
    const ext = extensionFromContentType(contentType) || extensionFromUrl(sourceUrl) || '.jpg'
    const base = slugify(product.name) || slugify(update.key) || 'product-image'
    const filename = ensureUniqueFilename(base, ext)
    const destPath = path.join(IMAGE_DIR, filename)
    const publicUrl = `/product-images/${filename}`

    if (!DRY_RUN) {
      fs.mkdirSync(IMAGE_DIR, { recursive: true })
      fs.writeFileSync(destPath, buffer)
      await supabase.from('products').update({ image_url: publicUrl }).eq('id', product.id)
    }

    return publicUrl
  }

  if (originalUrl.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', originalUrl)
    if (fs.existsSync(localPath)) {
      if (!DRY_RUN && product.image_url !== originalUrl) {
        await supabase.from('products').update({ image_url: originalUrl }).eq('id', product.id)
      }
      return { status: 'skipped', message: `Already local for ${product.name}` }
    }
    if (product.image_url && product.image_url.startsWith('http')) {
      const publicUrl = await downloadAndSave(product.image_url)
      return { status: 'updated', message: `Saved ${publicUrl} from current URL for ${product.name}` }
    }
    return { status: 'missing', message: `Local file not found for ${product.name}` }
  }

  const publicUrl = await downloadAndSave(originalUrl)
  return { status: 'updated', message: `Saved ${publicUrl} for ${product.name}` }
}

async function run() {
  const updates = await loadUpdates()
  const finalUpdates = LIMIT ? updates.slice(0, LIMIT) : updates

  console.log(`Found ${finalUpdates.length} unique chat image updates.`)
  if (DRY_RUN) {
    console.log('Running in dry-run mode.')
  }

  let updated = 0
  let skipped = 0
  let missing = 0
  let failed = 0
  const errors: string[] = []

  for (const update of finalUpdates) {
    try {
      const result = await localizeUpdate(update)
      if (result.status === 'updated') updated += 1
      if (result.status === 'skipped') skipped += 1
      if (result.status === 'missing') missing += 1
      if (result.status === 'failed') failed += 1
      console.log(`${result.status.toUpperCase()}: ${result.message}`)
    } catch (err) {
      failed += 1
      errors.push(`${update.type}:${update.key} -> ${String(err)}`)
      console.log(`FAILED: ${update.type}:${update.key} -> ${String(err)}`)
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    dry_run: DRY_RUN,
    total: finalUpdates.length,
    updated,
    skipped,
    missing,
    failed,
    errors,
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'local-chat-image-restore-report.json'),
    JSON.stringify(report, null, 2)
  )
}

run()
