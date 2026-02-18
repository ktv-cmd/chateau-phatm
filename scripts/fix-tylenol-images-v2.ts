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

// Manual mapping for better search results
const searchQueries: Record<string, string> = {
  'TYLENOL ES GC 500MG 100 RRL': 'Tylenol Extra Strength Rapid Release Gelcaps 100 count',
  'TYLENOL ES TB 500MG 100 CPLT': 'Tylenol Extra Strength Caplets 100 count',
  'TYLENOL ES TB 500MG 24': 'Tylenol Extra Strength Caplets 24 count',
  'TYLENOL ES E2S GC 500MG 100 CPLT': 'Tylenol Extra Strength Gelcaps 100 count',
  'TYLENOL PM TB 25-500MG 100CPLT': 'Tylenol PM Extra Strength 100 count',
  'TYLENOL CHD SS 160MG/5ML120ML GRP': 'Tylenol Children Grape Suspension 4 oz',
  'TYLENOL CHD SS 160/5 120ML STB': 'Tylenol Children Strawberry Suspension 4 oz',
  'TYLENOL CHD P/FVR SS160MG/5 120ML': 'Tylenol Children Cherry Suspension 4 oz',
  'TYLENOL CHD PK 18 BERRY': 'Tylenol Children Chewable Berry 18 count',
  'TYLENOL INFANTS SS 160MG/5ML 60ML': 'Tylenol Infants Suspension 2 oz'
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
  // Amazon product images - look for high quality versions
  const patterns = [
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\._AC_SL\d+_\.jpg/,
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\._AC_UL\d+_\.jpg/,
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\._UL\d+_\.jpg/,
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.jpg/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[0]
  }

  // Walmart
  const walmartMatch = html.match(/https:\/\/i5\.walmartimages\.com\/[^"'\s]+\.jpg/)
  if (walmartMatch) return walmartMatch[0]

  return null
}

async function searchAmazon(query: string): Promise<string | null> {
  console.log(`  Searching: "${query}"`)
  
  try {
    const encoded = encodeURIComponent(query)
    const html = await httpsGet(`https://www.amazon.com/s?k=${encoded}`)
    const imageUrl = extractImageFromHTML(html)
    
    if (imageUrl) {
      console.log(`  ✓ Found Amazon image`)
      return imageUrl
    }
  } catch (err) {
    console.log(`  ✗ Amazon failed`)
  }
  
  return null
}

async function searchWalmart(query: string): Promise<string | null> {
  console.log(`  Searching Walmart...`)
  
  try {
    const encoded = encodeURIComponent(query)
    const html = await httpsGet(`https://www.walmart.com/search?q=${encoded}`)
    const imageUrl = extractImageFromHTML(html)
    
    if (imageUrl) {
      console.log(`  ✓ Found Walmart image`)
      return imageUrl
    }
  } catch (err) {
    console.log(`  ✗ Walmart failed`)
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
    
    const query = searchQueries[product.name]
    if (!query) {
      console.log('  - No search query defined, skipping')
      continue
    }
    
    // Try Amazon
    let imageUrl = await searchAmazon(query)
    
    // Try Walmart if Amazon failed
    if (!imageUrl) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      imageUrl = await searchWalmart(query)
    }
    
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', product.id)

      if (updateError) {
        console.error(`  ✗ Update failed: ${updateError.message}`)
      } else {
        console.log(`  ✓ Updated: ${imageUrl.substring(0, 70)}...`)
      }
    } else {
      console.log(`  - No image found`)
    }
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n✅ Done!')
}

run()
