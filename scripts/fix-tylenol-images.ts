import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import https from 'https'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function cleanForSearch(name: string): string {
  return name
    .replace(/TYLENOL/gi, 'Tylenol')
    .replace(/CHD/gi, 'Children')
    .replace(/ES/gi, 'Extra Strength')
    .replace(/GC/gi, 'Gelcaps')
    .replace(/TB/gi, 'Tablets')
    .replace(/CPLT/gi, 'Caplets')
    .replace(/SS/gi, 'Suspension')
    .replace(/RRL/gi, 'Rapid Release')
    .replace(/E2S/gi, '')
    .replace(/PK/gi, '')
    .replace(/P\/FVR/gi, '')
    .replace(/STB/gi, 'Strawberry')
    .replace(/GRP/gi, 'Grape')
    .replace(/INFANTS/gi, 'Infants')
    .replace(/PM/gi, 'PM')
    .replace(/\d+MG\/\d+ML/gi, '')
    .replace(/\d+ML/gi, '')
    .replace(/\d+MG/gi, '')
    .replace(/\d+-\d+MG/gi, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    }

    https.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function extractImageFromHTML(html: string): string | null {
  // Amazon product images
  const amazonMatch = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\._[A-Z]{2}\d+_\.jpg/)
  if (amazonMatch) return amazonMatch[0]

  // Walmart product images
  const walmartMatch = html.match(/https:\/\/i5\.walmartimages\.com\/[^"'\s]+\.jpg/)
  if (walmartMatch) return walmartMatch[0]

  return null
}

async function searchAmazon(productName: string): Promise<string | null> {
  const searchTerm = cleanForSearch(productName)
  console.log(`  Searching Amazon: "${searchTerm}"`)
  
  try {
    const query = encodeURIComponent(searchTerm)
    const html = await httpsGet(`https://www.amazon.com/s?k=${query}`)
    const imageUrl = extractImageFromHTML(html)
    
    if (imageUrl) {
      console.log(`  ✓ Found: ${imageUrl.substring(0, 60)}...`)
      return imageUrl
    }
  } catch (err) {
    console.log(`  ✗ Amazon search failed`)
  }
  
  return null
}

async function searchWalmart(productName: string): Promise<string | null> {
  const searchTerm = cleanForSearch(productName)
  console.log(`  Searching Walmart: "${searchTerm}"`)
  
  try {
    const query = encodeURIComponent(searchTerm)
    const html = await httpsGet(`https://www.walmart.com/search?q=${query}`)
    const imageUrl = extractImageFromHTML(html)
    
    if (imageUrl) {
      console.log(`  ✓ Found: ${imageUrl.substring(0, 60)}...`)
      return imageUrl
    }
  } catch (err) {
    console.log(`  ✗ Walmart search failed`)
  }
  
  return null
}

async function run() {
  console.log('Fetching Tylenol products...\n')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .ilike('name', '%TYLENOL%')
    .order('name')

  if (error || !products) {
    console.error('Failed:', error?.message)
    process.exit(1)
  }

  console.log(`Found ${products.length} products\n`)

  for (const product of products) {
    console.log(`\n${product.name}`)
    
    // Try Amazon first
    let imageUrl = await searchAmazon(product.name)
    
    // Try Walmart if Amazon failed
    if (!imageUrl) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      imageUrl = await searchWalmart(product.name)
    }
    
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', product.id)

      if (updateError) {
        console.error(`  ✗ Update failed: ${updateError.message}`)
      } else {
        console.log(`  ✓ Updated in database`)
      }
    } else {
      console.log(`  - No image found, keeping existing`)
    }
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n✅ Done!')
}

run()
