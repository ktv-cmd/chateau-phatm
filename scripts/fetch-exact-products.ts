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

function httpsGet(url: string): Promise<any> {
  return new Promise((resolve) => {
    const options = { 
      timeout: 15000, 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      } 
    }
    https.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(null) }
      })
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null))
  })
}

// Create better search queries from product names
function createSearchQuery(productName: string): string {
  // Extract key product information
  let query = productName
    // Remove common abbreviations that don't help search
    .replace(/\b(TB|CP|GC|SN|DR|SS|LQ|CR|OI|MW|SP|AR|GL|EN|LT|PA|PD|ST|KT|BR|PC|AE|SU|FC|SL|PW|CW|AP|DS|EA)\b/g, '')
    // Convert common medical terms
    .replace(/\bMG\b/gi, 'mg')
    .replace(/\bML\b/gi, 'ml')
    .replace(/\bMCG\b/gi, 'mcg')
    .replace(/\bOZ\b/gi, 'oz')
    // Clean up
    .replace(/\s+/g, ' ')
    .trim()
  
  // Take first few meaningful words
  const words = query.split(' ').filter(w => w.length > 2).slice(0, 5)
  return words.join(' ')
}

async function searchMultipleSources(productName: string, sku: string | null): Promise<string | null> {
  const searchQuery = createSearchQuery(productName)
  
  // Source 1: UPCitemdb with search query
  try {
    const url = `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(searchQuery)}&match_mode=0&type=product`
    const data = await httpsGet(url)
    
    if (data?.items?.length > 0) {
      // Find best match
      for (const item of data.items) {
        if (item.images && item.images.length > 0) {
          // Check if title somewhat matches
          const titleLower = (item.title || '').toLowerCase()
          const queryWords = searchQuery.toLowerCase().split(' ')
          const matchCount = queryWords.filter(word => titleLower.includes(word)).length
          
          // If at least 50% of words match, use this image
          if (matchCount >= queryWords.length * 0.5) {
            return item.images[0]
          }
        }
      }
      
      // If no good match, use first result anyway
      if (data.items[0].images && data.items[0].images.length > 0) {
        return data.items[0].images[0]
      }
    }
  } catch {}
  
  // Source 2: Try with SKU if available
  if (sku) {
    try {
      const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${sku}`
      const data = await httpsGet(url)
      
      if (data?.items?.[0]?.images?.[0]) {
        return data.items[0].images[0]
      }
    } catch {}
  }
  
  return null
}

async function main() {
  console.log('🎯 Fetching EXACT Product Images (Aggressive Search)\n')
  console.log('='.repeat(70))
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, sku, brand, category, image_url')
    .order('name')
  
  if (error || !products) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`✅ Found ${products.length} products`)
  console.log('🔍 Searching for exact product matches...\n')
  
  const stats = {
    total: products.length,
    foundReal: 0,
    notFound: 0,
    alreadyHas: 0
  }
  
  const batchSize = 5 // Smaller batches for API rate limits
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(products.length / batchSize)
    
    console.log(`📦 Batch ${batchNum}/${totalBatches}`)
    
    for (const product of batch) {
      const productNum = i + batch.indexOf(product) + 1
      const shortName = product.name.substring(0, 40).padEnd(40, ' ')
      process.stdout.write(`   [${productNum}/${stats.total}] ${shortName}`)
      
      // Skip if already has non-Unsplash image
      if (product.image_url && !product.image_url.includes('unsplash')) {
        stats.alreadyHas++
        console.log('⏭️  Has image')
        continue
      }
      
      const imageUrl = await searchMultipleSources(product.name, product.sku)
      
      if (imageUrl) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', product.id)
        
        if (!updateError) {
          stats.foundReal++
          console.log('✅ Found')
        } else {
          stats.notFound++
          console.log('❌ Update failed')
        }
      } else {
        stats.notFound++
        console.log('❌ Not found')
      }
      
      // Rate limiting - 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
    
    console.log()
  }
  
  console.log('='.repeat(70))
  console.log(`\n📊 Final Results:`)
  console.log(`   Total products: ${stats.total}`)
  console.log(`   ✅ Real product images found: ${stats.foundReal}`)
  console.log(`   ⏭️  Already had images: ${stats.alreadyHas}`)
  console.log(`   ❌ Not found: ${stats.notFound}`)
  console.log(`   Success rate: ${((stats.foundReal / (stats.total - stats.alreadyHas)) * 100).toFixed(1)}%`)
  console.log('\n='.repeat(70))
}

main()
