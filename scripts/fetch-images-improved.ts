import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as https from 'https'
import * as http from 'http'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper to make HTTP requests
function httpsGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    
    const options = {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductImageFetcher/1.0)'
      }
    }
    
    protocol.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve(null)
        }
      })
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null))
  })
}

// Extract searchable product name
function extractSearchTerm(productName: string): string {
  // Remove dosage info, counts, and codes
  let cleaned = productName
    .replace(/\b\d+(\.\d+)?%?\b/g, '') // Remove percentages and numbers
    .replace(/\b(TB|CP|GC|LQ|CR|OI|SN|DR|SS|MW|SP|AR|GL|EN|LT|PA|PD|ST|KT|BR|PC|AE|SU|FC|SL|PW|CW)\b/gi, '') // Remove form codes
    .replace(/\b\d+MG\b/gi, 'MG') // Normalize MG
    .replace(/\b\d+ML\b/gi, 'ML') // Normalize ML
    .replace(/\b\d+MCG\b/gi, 'MCG') // Normalize MCG
    .replace(/\d+/g, '') // Remove remaining numbers
    .replace(/[\/\-_]+/g, ' ') // Replace separators with space
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
  
  // Take first 2-3 meaningful words (usually brand + product type)
  const words = cleaned.split(' ').filter(w => w.length > 2)
  return words.slice(0, 3).join(' ')
}

async function searchByName(productName: string): Promise<string | null> {
  const searchTerm = extractSearchTerm(productName)
  
  if (!searchTerm || searchTerm.length < 3) return null
  
  try {
    const url = `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(searchTerm)}`
    const data = await httpsGet(url)
    
    if (data?.items?.length > 0) {
      // Return first image found
      for (const item of data.items) {
        if (item.images && item.images.length > 0) {
          return item.images[0]
        }
      }
    }
  } catch (error) {
    // Silent fail
  }
  
  return null
}

async function searchBySKU(sku: string): Promise<string | null> {
  if (!sku) return null
  
  try {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${sku}`
    const data = await httpsGet(url)
    
    if (data?.items?.[0]?.images?.[0]) {
      return data.items[0].images[0]
    }
  } catch (error) {
    // Silent fail
  }
  
  return null
}

function getPlaceholderImage(category: string): string {
  const categoryMap: Record<string, string> = {
    'Pain & Fever Relief': 'https://via.placeholder.com/400x400/4A90E2/ffffff?text=Pain+Relief',
    'Cold, Flu & Sinus': 'https://via.placeholder.com/400x400/7B68EE/ffffff?text=Cold+%26+Flu',
    'Allergy': 'https://via.placeholder.com/400x400/FF6B6B/ffffff?text=Allergy',
    'Digestive Health': 'https://via.placeholder.com/400x400/4ECDC4/ffffff?text=Digestive',
    'Vitamins & Supplements': 'https://via.placeholder.com/400x400/FFD93D/ffffff?text=Vitamins',
    'Skin Care & Topicals': 'https://via.placeholder.com/400x400/95E1D3/ffffff?text=Skin+Care',
    'First Aid': 'https://via.placeholder.com/400x400/F38181/ffffff?text=First+Aid',
    'Eye & Ear Care': 'https://via.placeholder.com/400x400/AA96DA/ffffff?text=Eye+Care',
    'Oral Care': 'https://via.placeholder.com/400x400/FCBAD3/ffffff?text=Oral+Care',
    'Sleep & Relaxation': 'https://via.placeholder.com/400x400/A8D8EA/ffffff?text=Sleep',
    'Feminine Care': 'https://via.placeholder.com/400x400/FFA8C5/ffffff?text=Feminine',
    'Diabetes Care': 'https://via.placeholder.com/400x400/84DCC6/ffffff?text=Diabetes',
    'Baby & Child Care': 'https://via.placeholder.com/400x400/FFE66D/ffffff?text=Baby+Care',
    'Over-the-Counter': 'https://via.placeholder.com/400x400/A8E6CF/ffffff?text=OTC'
  }
  
  return categoryMap[category] || 'https://via.placeholder.com/400x400/CCCCCC/ffffff?text=Product'
}

async function fetchImageForProduct(product: any): Promise<{ imageUrl: string, source: string }> {
  // Strategy 1: Search by product name (BEST for common products)
  const nameImage = await searchByName(product.name)
  if (nameImage) {
    return { imageUrl: nameImage, source: 'Name Search' }
  }
  
  // Strategy 2: Search by SKU
  const skuImage = await searchBySKU(product.sku)
  if (skuImage) {
    return { imageUrl: skuImage, source: 'SKU Lookup' }
  }
  
  // Strategy 3: Placeholder
  const placeholder = getPlaceholderImage(product.category)
  return { imageUrl: placeholder, source: 'Placeholder' }
}

async function main() {
  console.log('🚀 Fetching REAL Images for All Products (Improved)\n')
  console.log('='.repeat(70))
  console.log('Strategy: Product Name Search → SKU Lookup → Placeholder\n')
  
  try {
    // Fetch all products
    console.log('📥 Fetching products from database...')
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, category, image_url')
      .order('name')
    
    if (error) throw error
    
    console.log(`✅ Found ${products?.length || 0} total products\n`)
    
    const stats = {
      total: products?.length || 0,
      realImages: 0,
      placeholders: 0,
      bySource: {} as Record<string, number>
    }
    
    console.log('🔄 Processing products...\n')
    
    const batchSize = 10
    for (let i = 0; i < (products?.length || 0); i += batchSize) {
      const batch = products!.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil((products?.length || 0) / batchSize)
      
      console.log(`📦 Batch ${batchNum}/${totalBatches}`)
      
      for (const product of batch) {
        const productNum = i + batch.indexOf(product) + 1
        const shortName = product.name.substring(0, 35).padEnd(35, ' ')
        process.stdout.write(`   [${productNum}/${stats.total}] ${shortName} `)
        
        const { imageUrl, source } = await fetchImageForProduct(product)
        
        // Update product
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', product.id)
        
        if (!updateError) {
          stats.bySource[source] = (stats.bySource[source] || 0) + 1
          
          if (source === 'Name Search' || source === 'SKU Lookup') {
            stats.realImages++
            console.log(`✅ ${source}`)
          } else {
            stats.placeholders++
            console.log(`📦 ${source}`)
          }
        } else {
          console.log(`❌ Failed`)
        }
        
        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      
      console.log()
    }
    
    console.log('='.repeat(70))
    console.log('\n📊 Final Results:')
    console.log(`   Total products: ${stats.total}`)
    console.log(`   ✅ Real images found: ${stats.realImages}`)
    console.log(`   📦 Placeholders: ${stats.placeholders}`)
    console.log(`   Success rate: ${((stats.realImages / stats.total) * 100).toFixed(1)}%`)
    console.log('\n📈 By source:')
    Object.entries(stats.bySource)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        const pct = ((count / stats.total) * 100).toFixed(1)
        console.log(`   ${source}: ${count} (${pct}%)`)
      })
    
    console.log('\n='.repeat(70))
    console.log('✅ Image fetching completed!')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
