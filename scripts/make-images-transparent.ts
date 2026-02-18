import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import http from 'http'
import { spawnSync } from 'child_process'

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

const outputDir = path.join(process.cwd(), 'public', 'product-images', 'transparent')
fs.mkdirSync(outputDir, { recursive: true })

function getArg(name: string): string | undefined {
  const entry = process.argv.find(arg => arg.startsWith(`${name}=`))
  return entry ? entry.split('=')[1] : undefined
}

const brandFilter = getArg('--brand')
const limitArg = getArg('--limit')
const limit = limitArg ? Number(limitArg) : undefined
const force = process.argv.includes('--force')

function downloadFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const request = client.get(url, (res) => {
      const status = res.statusCode || 0
      if (status >= 300 && status < 400 && res.headers.location) {
        downloadFile(res.headers.location, destination).then(resolve).catch(reject)
        return
      }
      if (status < 200 || status >= 300) {
        reject(new Error(`Failed to download ${url}. Status ${status}`))
        return
      }

      const file = fs.createWriteStream(destination)
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    })

    request.on('error', (err) => reject(err))
  })
}

function removeBackground(inputPath: string, outputPath: string) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'rembg_remove.py')
  const result = spawnSync('python3', [scriptPath, inputPath, outputPath], {
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    const errorText = result.stderr?.toString() || 'Unknown error'
    throw new Error(errorText)
  }
}

async function run() {
  let query = supabase
    .from('products')
    .select('id, name, image_url')
    .not('image_url', 'is', null)

  if (brandFilter) {
    query = query.ilike('name', `%${brandFilter}%`)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  const products = limit ? data.slice(0, limit) : data

  console.log(`Processing ${products.length} products${brandFilter ? ` for ${brandFilter}` : ''}...`)

  for (const product of products) {
    if (!product.image_url) continue

    const outputFile = `${product.id}.png`
    const outputPath = path.join(outputDir, outputFile)
    const publicUrl = `/product-images/transparent/${outputFile}`

    if (!force && fs.existsSync(outputPath)) {
      console.log(`Skipping ${product.name} (already processed)`)
      continue
    }

    const url = product.image_url
    if (url.startsWith('/')) {
      // Already a local hosted image path.
      console.log(`Skipping ${product.name} (already local image path)`)
      continue
    }
    const ext = path.extname(new URL(url).pathname) || '.jpg'
    const tempPath = path.join(os.tmpdir(), `${product.id}${ext}`)

    try {
      console.log(`\n${product.name}`)
      await downloadFile(url, tempPath)
      removeBackground(tempPath, outputPath)

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', product.id)

      if (updateError) {
        console.error(`Failed to update ${product.name}: ${updateError.message}`)
      } else {
        console.log(`Updated image: ${publicUrl}`)
      }
    } catch (err) {
      console.error(`Failed for ${product.name}: ${(err as Error).message}`)
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    }
  }

  console.log('\nDone.')
}

run()
