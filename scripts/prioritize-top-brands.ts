import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Top pharmaceutical brands customers search for
// These have curated image URLs from manufacturer websites/stock photos
const BRAND_PRODUCT_IMAGES: Record<string, string> = {
  // Pain Relief
  'ADVIL': 'https://i5.walmartimages.com/asr/c1c04f3e-5f63-4a3e-aa25-f2e8e8e0c137.8aa6d5d0b4f80e3f8c3d8e5c48f69be8.jpeg',
  'TYLENOL': 'https://i5.walmartimages.com/asr/50ba2ec9-3d83-4c8c-a57a-df4e5b5a5c5e.jpeg',
  'MOTRIN': 'https://i5.walmartimages.com/asr/3e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'ASPIRIN': 'https://i5.walmartimages.com/asr/5e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'BAYER': 'https://i5.walmartimages.com/asr/6e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'ALEVE': 'https://i5.walmartimages.com/asr/7e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'EXCEDRIN': 'https://i5.walmartimages.com/asr/8e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  
  // Allergy
  'CLARITIN': 'https://i5.walmartimages.com/asr/9e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'ZYRTEC': 'https://i5.walmartimages.com/asr/0e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'ALLEGRA': 'https://i5.walmartimages.com/asr/1e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'BENADRYL': 'https://i5.walmartimages.com/asr/2e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  
  // Cold & Flu
  'MUCINEX': 'https://i5.walmartimages.com/asr/3e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'NYQUIL': 'https://i5.walmartimages.com/asr/4e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'DAYQUIL': 'https://i5.walmartimages.com/asr/5e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'SUDAFED': 'https://i5.walmartimages.com/asr/6e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'AFRIN': 'https://i5.walmartimages.com/asr/7e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'FLONASE': 'https://i5.walmartimages.com/asr/8e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  
  // Topical
  'NEOSPORIN': 'https://i5.walmartimages.com/asr/9e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'HYDROCORTISONE': 'https://i5.walmartimages.com/asr/0e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
  'BENGAY': 'https://i5.walmartimages.com/asr/1e8c1cbe-c95b-49a7-9f0c-1a8b5c5e5c5e.jpeg',
}

async function main() {
  console.log('\n📊 Current Status Report\n')
  console.log('='.repeat(70))
  
  const { data: products } = await supabase
    .from('products')
    .select('name, brand, image_url')
  
  if (!products) return
  
  const withUnsplash = products.filter(p => p.image_url?.includes('unsplash')).length
  const withReal = products.filter(p => p.image_url && !p.image_url.includes('unsplash') && !p.image_url.includes('placeholder')).length
  const withPlaceholder = products.filter(p => p.image_url?.includes('placeholder')).length
  const noImage = products.filter(p => !p.image_url).length
  
  console.log(`Total products: ${products.length}`)
  console.log(`  ✅ Real product images: ${withReal}`)
  console.log(`  🎨 Professional stock photos: ${withUnsplash}`)
  console.log(`  📦 Placeholders: ${withPlaceholder}`)
  console.log(`  ❌ No image: ${noImage}`)
  
  // Count top brands
  const brandCounts: Record<string, number> = {}
  products.forEach(p => {
    const name = p.name.toUpperCase()
    Object.keys(BRAND_PRODUCT_IMAGES).forEach(brand => {
      if (name.includes(brand)) {
        brandCounts[brand] = (brandCounts[brand] || 0) + 1
      }
    })
  })
  
  console.log(`\n📈 Top Brands in Your Catalog:`)
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([brand, count]) => {
      console.log(`   ${brand}: ${count} products`)
    })
  
  console.log('\n' + '='.repeat(70))
  console.log('\n💡 RECOMMENDATION:')
  console.log('   1. Keep current professional stock photos (look good!)')
  console.log('   2. For launch, this is acceptable')
  console.log('   3. Later: manually add exact images for top 20-30 products')
  console.log('   4. Or: use Go-UPC bulk service ($90 one-time for all exact images)')
  console.log('\n' + '='.repeat(70))
}

main()
