import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as https from 'https'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function httpsGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        ...headers
      }
    }
    
    https.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')))
  })
}

// Extract image URL from Amazon/Walmart product page HTML
function extractImageFromHTML(html: string): string | null {
  // Look for common image patterns
  const patterns = [
    /"hiRes":"(https:\/\/[^"]+\.jpg[^"]*)"/,
    /"large":"(https:\/\/[^"]+\.jpg[^"]*)"/,
    /data-old-hires="(https:\/\/[^"]+\.jpg[^"]*)"/,
    /data-a-dynamic-image=".*?(https:\/\/images-na\.ssl-images-amazon\.com[^"]+\.jpg)/,
    /i5\.walmartimages\.com\/[^"]+\.jpeg/,
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      return match[1] || match[0]
    }
  }
  
  return null
}

// Clean product name for better search
function cleanForSearch(name: string): string {
  return name
    .replace(/\b\d+(\.\d+)?%?\b/g, '')
    .replace(/\b(TB|CP|GC|LQ|CR|OI|SN|DR|SS|MW|SP|AR|GL|EN|LT|PA|PD|ST|KT|BR|PC|AE|SU|FC|SL|PW|CW|AP|DS|EA|MS|ND|RS|EC|IR|ER)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 4)
    .join(' ')
}

async function searchAmazon(productName: string): Promise<string | null> {
  try {
    const cleanName = cleanForSearch(productName)
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(cleanName)}`
    
    const html = await httpsGet(searchUrl)
    
    // Extract first product image
    const imageMatch = html.match(/https:\/\/m\.media-amazon\.com\/images\/[^"]+\.jpg/)
    if (imageMatch) {
      return imageMatch[0]
    }
  } catch {}
  
  return null
}

async function searchWalmart(productName: string): Promise<string | null> {
  try {
    const cleanName = cleanForSearch(productName)
    const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(cleanName)}`
    
    const html = await httpsGet(searchUrl)
    
    // Extract Walmart image
    const imageMatch = html.match(/https:\/\/i5\.walmartimages\.com\/[^"]+\.jpeg[^"]*/);
    if (imageMatch) {
      return imageMatch[0]
    }
  } catch {}
  
  return null
}

async function main() {
  console.log('🛒 Searching Amazon & Walmart for Product Images\n')
  console.log('='.repeat(70))
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .order('name')
  
  if (error || !products) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`✅ Processing ALL ${products.length} products\n`)
  console.log('⏱️  Estimated time: ~20 minutes (2 seconds per product)\n')
  
  const stats = { found: 0, notFound: 0 }
  
  for (const product of products) {
    console.log(`\n🔍 ${product.name}`)
    
    // Try Amazon first
    console.log('   Trying Amazon...')
    let imageUrl = await searchAmazon(product.name)
    
    if (!imageUrl) {
      // Try Walmart
      console.log('   Trying Walmart...')
      imageUrl = await searchWalmart(product.name)
    }
    
    if (imageUrl) {
      console.log(`   ✅ Found: ${imageUrl.substring(0, 80)}...`)
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', product.id)
      
      if (!updateError) {
        stats.found++
        console.log('   ✅ Updated in database')
      }
    } else {
      stats.notFound++
      console.log('   ❌ No image found')
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Results:`)
  console.log(`   Found: ${stats.found}`)
  console.log(`   Not found: ${stats.notFound}`)
  console.log('\n='.repeat(70))
}

main()
