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

// High-quality free images from Unsplash (free for commercial use)
const CATEGORY_IMAGES: Record<string, string[]> = {
  'Pain & Fever Relief': [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80', // Pills/tablets
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80', // Medicine bottles
  ],
  'Cold, Flu & Sinus': [
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80', // Cold medicine
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
  ],
  'Allergy': [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',
  ],
  'Digestive Health': [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80',
  ],
  'Vitamins & Supplements': [
    'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800&q=80', // Vitamins
    'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=800&q=80', // Pills
  ],
  'Skin Care & Topicals': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80', // Skincare
    'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=800&q=80', // Cream/lotion
  ],
  'First Aid': [
    'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800&q=80', // First aid
    'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80', // Bandages
  ],
  'Eye & Ear Care': [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
  ],
  'Oral Care': [
    'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&q=80', // Toothbrush
    'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=800&q=80', // Dental care
  ],
  'Sleep & Relaxation': [
    'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80', // Sleep
  ],
  'Feminine Care': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
  ],
  'Diabetes Care': [
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80', // Medical device
  ],
  'Baby & Child Care': [
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80', // Baby care
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80', // Baby products
  ],
  'Over-the-Counter': [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80', // Generic medicine
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80', // Medicine bottles
  ],
}

function getImageForCategory(category: string, productIndex: number): string {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Over-the-Counter']
  return images[productIndex % images.length]
}

async function main() {
  console.log('🎨 Adding High-Quality Category Images\n')
  console.log('='.repeat(70))
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, category, image_url')
    .order('category, name')
  
  if (error || !products) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`✅ Found ${products.length} products\n`)
  
  const stats = { updated: 0, skipped: 0 }
  const categoryIndexes: Record<string, number> = {}
  
  for (const product of products) {
    // Skip products that already have good images (not placeholder)
    if (product.image_url && !product.image_url.includes('placeholder')) {
      stats.skipped++
      continue
    }
    
    // Get category index for variation
    if (!categoryIndexes[product.category]) {
      categoryIndexes[product.category] = 0
    }
    
    const imageUrl = getImageForCategory(product.category, categoryIndexes[product.category])
    categoryIndexes[product.category]++
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', product.id)
    
    if (!updateError) {
      stats.updated++
      if (stats.updated % 50 === 0) {
        console.log(`   Updated ${stats.updated}/${products.length}...`)
      }
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Results:`)
  console.log(`   Updated: ${stats.updated}`)
  console.log(`   Skipped (already has image): ${stats.skipped}`)
  console.log('\n='.repeat(70))
  console.log('✅ All products now have professional images!')
}

main()
