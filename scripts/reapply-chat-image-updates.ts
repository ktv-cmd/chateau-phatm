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

const TRANSCRIPT_PATH =
  process.env.TRANSCRIPT_PATH ||
  path.join(
    process.env.HOME || '',
    '.cursor/projects/Users-kaykovmedia-Downloads-webs-web-cha/agent-transcripts/d593d11b-ed9b-4a6b-af6a-dac9f87feca9.txt'
  )

const SKIP_URL_PATTERNS = [
  'example.com',
  'via.placeholder.com',
  'localhost',
]

function shouldSkipUrl(url: string): boolean {
  return SKIP_URL_PATTERNS.some((pattern) => url.includes(pattern))
}

function isLikelyUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
}

type Update = { key: string; url: string; type: 'name' | 'id' }

function pushUpdate(updates: Update[], type: Update['type'], key: string, url: string) {
  if (!key || !url) return
  if (key === 'ID') return
  if (key === 'NAME') return
  if (url === 'URL') return
  if (!isLikelyUrl(url)) return
  if (shouldSkipUrl(url)) return
  updates.push({ type, key, url })
}

function parsePayload(payload: string): Update[] {
  const updates: Array<Update & { index: number }> = []

  const patterns: Array<{ regex: RegExp; map: (m: RegExpMatchArray) => Update | null }> = [
    {
      regex: /update-product-image\.ts\s+"([^"]+)"\s+"([^"]+)"/g,
      map: (m) => ({ type: 'name', key: m[1].trim(), url: m[2].trim() }),
    },
    {
      regex: /update\(\{\s*image_url:\s*'([^']+)'\s*\}\)\.eq\('name','([^']+)'\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim() }),
    },
    {
      regex: /update\(\{\s*image_url:\s*"([^"]+)"\s*\}\)\.eq\("name","([^"]+)"\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim() }),
    },
    {
      regex: /update\(\{\s*image_url:\s*'([^']+)'\s*\}\)\.eq\('id','([^']+)'\)/g,
      map: (m) => ({ type: 'id', key: m[2].trim(), url: m[1].trim() }),
    },
    {
      regex: /name:\s*'([^']+)'\s*,\s*image_url:\s*'([^']+)'/g,
      map: (m) => ({ type: 'name', key: m[1].trim(), url: m[2].trim() }),
    },
    {
      regex: /const image='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*image[^}]*\}\)\.eq\('id','([^']+)'\)/g,
      map: (m) => ({ type: 'id', key: m[2].trim(), url: m[1].trim() }),
    },
    {
      regex: /const image='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*image[^}]*\}\)\.eq\('name','([^']+)'\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim() }),
    },
    {
      regex: /const name='([^']+)';[\s\S]*?const image='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*image[^}]*\}\)\.eq\('name',name\)/g,
      map: (m) => ({ type: 'name', key: m[1].trim(), url: m[2].trim() }),
    },
    {
      regex: /const url='([^']+)';[\s\S]*?update\(\{\s*image_url:\s*url[^}]*\}\)\.eq\('name','([^']+)'\)/g,
      map: (m) => ({ type: 'name', key: m[2].trim(), url: m[1].trim() }),
    },
  ]

  for (const { regex, map } of patterns) {
    for (const match of payload.matchAll(regex)) {
      const update = map(match)
      if (update) updates.push({ ...update, index: match.index ?? 0 })
    }
  }

  if (payload.includes('update({image_url') || payload.includes('update({ image_url')) {
    const tuplePairs = /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g
    for (const match of payload.matchAll(tuplePairs)) {
      updates.push({
        type: 'name',
        key: match[1].trim(),
        url: match[2].trim(),
        index: match.index ?? 0,
      })
    }
  }

  updates.sort((a, b) => a.index - b.index)
  return updates
}

function parseTranscript(content: string): Update[] {
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
      parsePayload(payload).forEach((u) => pushUpdate(updates, u.type, u.key, u.url))
      continue
    }

    parsePayload(command).forEach((u) => pushUpdate(updates, u.type, u.key, u.url))
  }

  return updates
}

function parseTylenolUpdates(): Update[] {
  const updates: Update[] = []
  const tylenolPath = path.join(process.cwd(), 'scripts/update-tylenol-products.ts')
  if (!fs.existsSync(tylenolPath)) return updates

  const content = fs.readFileSync(tylenolPath, 'utf8')
  const regex = /name:\s*'([^']+)'\s*,[\s\S]*?image_url:\s*'([^']+)'/g
  for (const match of content.matchAll(regex)) {
    pushUpdate(updates, 'name', match[1].trim(), match[2].trim())
  }

  return updates
}

async function applyUpdates(updates: Update[]) {
  const applied = new Map<string, Update>()
  for (const u of updates) {
    const key = `${u.type}:${u.key}`
    applied.set(key, u)
  }

  const finalUpdates = [...applied.values()]

  console.log(`Found ${finalUpdates.length} unique image updates from chat.`)
  finalUpdates.forEach((u) => {
    console.log(`- ${u.type}:${u.key} -> ${u.url}`)
  })

  let success = 0
  let failed = 0
  const failures: string[] = []

  for (const u of finalUpdates) {
    const query = supabase.from('products').update({ image_url: u.url })
    const { error } =
      u.type === 'id'
        ? await query.eq('id', u.key)
        : await query.eq('name', u.key)

    if (error) {
      failed += 1
      failures.push(`${u.type}:${u.key} -> ${u.url} (${error.message})`)
    } else {
      success += 1
    }
  }

  console.log(`Applied: ${success}`)
  console.log(`Failed: ${failed}`)
  if (failures.length > 0) {
    failures.forEach((line) => console.log(`- ${line}`))
  }
}

async function run() {
  if (!fs.existsSync(TRANSCRIPT_PATH)) {
    console.error(`Transcript not found: ${TRANSCRIPT_PATH}`)
    process.exit(1)
  }

  const content = fs.readFileSync(TRANSCRIPT_PATH, 'utf8')
  const updates = [...parseTranscript(content), ...parseTylenolUpdates()]
  await applyUpdates(updates)
}

run()
