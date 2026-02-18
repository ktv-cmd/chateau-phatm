import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ImageSource {
  name: string
  fetchImage: (product: any) => Promise<string | null>
}

// Helper to make HTTP requests
function httpsGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    
    protocol.get(url, { timeout: 10000 }, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve(null)
        }
      })
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')))
  })
}

// Source 1: UPCitemdb (Free, 100/day, no signup)
const upcitemdbSource: ImageSource = {
  name: 'UPCitemdb',
  fetchImage: async (product) => {
    if (!product.sku) return null
    
    try {
      const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${product.sku}`
      const data = await httpsGet(url)
      
      if (data?.items?.[0]?.images?.[0]) {
        return data.items[0].images[0]
      }
    } catch (error) {
      // Silent fail, try next source
    }
    return null
  }
}

// Source 2: Open Food Facts (Free, unlimited)
const openFoodFactsSource: ImageSource = {
  name: 'Open Food Facts',
  fetchImage: async (product) => {
    if (!product.sku) return null
    
    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${product.sku}.json`
      const data = await httpsGet(url)
      
      if (data?.product?.image_url) {
        return data.product.image_url
      }
    } catch (error) {
      // Silent fail
    }
    return null
  }
}

// Source 3: DailyMed NDC lookup (Free, unlimited)
const dailyMedSource: ImageSource = {
  name: 'DailyMed',
  fetchImage: async (product) => {
    if (!product.sku) return null
    
    try {
      // DailyMed uses NDC format, try to format the SKU
      const ndc = product.sku.toString().padStart(11, '0')
      const url = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?ndc=${ndc}`
      const data = await httpsGet(url)
      
      if (data?.data?.[0]?.splimage) {
        return `https://dailymed.nlm.nih.gov${data.data[0].splimage}`
      }
    } catch (error) {
      // Silent fail
    }
    return null
  }
}

// Source 4: Generic placeholder based on product type
const placeholderSource: ImageSource = {
  name: 'Placeholder',
  fetchImage: async (product) => {
    const categoryMap: Record<string, string> = {
      'Pain & Fever Relief': 'https://via.placeholder.com/400x400/4A90E2/ffffff?text=Pain+Relief',
      'Cold, Flu & Sinus': 'https://via.placeholder.com/400x400/7B68EE/ffffff?text=Cold+%26+Flu',
      'Allergy': 'https://via.placeholder.com/400x400/FF6B6B/ffffff?text=Allergy',
      'Digestive Health': 'https://via.placeholder.com/400x400/4ECDC4/ffffff?text=Digestive+Health',
      'Vitamins & Supplements': 'https://via.placeholder.com/400x400/FFD93D/ffffff?text=Vitamins',
      'Skin Care & Topicals': 'https://via.placeholder.com/400x400/95E1D3/ffffff?text=Skin+Care',
      'First Aid': 'https://via.placeholder.com/400x400/F38181/ffffff?text=First+Aid',
      'Eye & Ear Care': 'https://via.placeholder.com/400x400/AA96DA/ffffff?text=Eye+%26+Ear',
      'Oral Care': 'https://via.placeholder.com/400x400/FCBAD3/ffffff?text=Oral+Care',
      'Sleep & Relaxation': 'https://via.placeholder.com/400x400/A8D8EA/ffffff?text=Sleep',
      'Feminine Care': 'https://via.placeholder.com/400x400/FFA8C5/ffffff?text=Feminine+Care',
      'Diabetes Care': 'https://via.placeholder.com/400x400/84DCC6/ffffff?text=Diabetes+Care',
      'Baby & Child Care': 'https://via.placeholder.com/400x400/FFE66D/ffffff?text=Baby+Care',
      'Over-the-Counter': 'https://via.placeholder.com/400x400/A8E6CF/ffffff?text=OTC'
    }
    
    return categoryMap[product.category] || 'https://via.placeholder.com/400x400/CCCCCC/ffffff?text=Product'
  }
}

// All sources in priority order
const imageSources: ImageSource[] = [
  upcitemdbSource,
  openFoodFactsSource,
  dailyMedSource,
  placeholderSource // Always succeeds as fallback
]

async function fetchImageForProduct(product: any): Promise<{ imageUrl: string | null, source: string }> {
  for (const source of imageSources) {
    try {
      const imageUrl = await source.fetchImage(product)
      if (imageUrl) {
        return { imageUrl, source: source.name }
      }
    } catch (error) {
      console.error(`   ⚠️  ${source.name} error for ${product.name}`)
    }
  }
  
  return { imageUrl: null, source: 'None' }
}

async function updateProductImage(productId: string, imageUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ image_url: imageUrl })
    .eq('id', productId)
  
  return !error
}

async function main() {
  console.log('🚀 Starting Image Fetching for All Products\n')
  console.log('='.repeat(70))
  
  try {
    // Fetch all products without images
    console.log('\n📥 Fetching products from database...')
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, category, image_url')
      .order('name')
    
    if (error) throw error
    
    const productsNeedingImages = products?.filter(p => !p.image_url) || []
    const productsWithImages = products?.filter(p => p.image_url) || []
    
    console.log(`✅ Found ${products?.length || 0} total products`)
    console.log(`   📸 ${productsWithImages.length} already have images`)
    console.log(`   🔍 ${productsNeedingImages.length} need images`)
    
    if (productsNeedingImages.length === 0) {
      console.log('\n🎉 All products already have images!')
      return
    }
    
    console.log('\n🔄 Fetching images from multiple sources...')
    console.log('   Sources: UPCitemdb → Open Food Facts → DailyMed → Placeholder\n')
    
    const stats = {
      total: productsNeedingImages.length,
      success: 0,
      failed: 0,
      bySource: {} as Record<string, number>
    }
    
    const batchSize = 10
    for (let i = 0; i < productsNeedingImages.length; i += batchSize) {
      const batch = productsNeedingImages.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(productsNeedingImages.length / batchSize)
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} products)`)
      
      for (const product of batch) {
        const productNum = i + batch.indexOf(product) + 1
        process.stdout.write(`   [${productNum}/${stats.total}] ${product.name.substring(0, 40)}... `)
        
        const { imageUrl, source } = await fetchImageForProduct(product)
        
        if (imageUrl) {
          const updated = await updateProductImage(product.id, imageUrl)
          if (updated) {
            stats.success++
            stats.bySource[source] = (stats.bySource[source] || 0) + 1
            console.log(`✅ ${source}`)
          } else {
            stats.failed++
            console.log(`❌ Update failed`)
          }
        } else {
          stats.failed++
          console.log(`❌ No image found`)
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n📊 Final Statistics:')
    console.log(`   Total products processed: ${stats.total}`)
    console.log(`   ✅ Successfully updated: ${stats.success}`)
    console.log(`   ❌ Failed: ${stats.failed}`)
    console.log('\n📈 Images by source:')
    Object.entries(stats.bySource)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`)
      })
    
    // Final verification
    console.log('\n🔍 Final Verification...')
    const { data: finalProducts } = await supabase
      .from('products')
      .select('image_url')
    
    const withImages = finalProducts?.filter(p => p.image_url).length || 0
    const total = finalProducts?.length || 0
    
    console.log(`   Total products: ${total}`)
    console.log(`   With images: ${withImages}`)
    console.log(`   Without images: ${total - withImages}`)
    
    console.log('\n='.repeat(70))
    console.log('✅ Image fetching completed!')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
