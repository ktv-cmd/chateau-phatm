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

async function countImages() {
  const { data } = await supabase
    .from('products')
    .select('id, name, image_url')
  
  if (!data) return
  
  const stats = {
    total: data.length,
    amazon: data.filter(p => p.image_url?.includes('amazon')).length,
    walmart: data.filter(p => p.image_url?.includes('walmart')).length,
    unsplash: data.filter(p => p.image_url?.includes('unsplash')).length,
    placeholder: data.filter(p => p.image_url?.includes('placeholder')).length,
    none: data.filter(p => !p.image_url).length,
  }
  
  console.log('\n📊 FINAL IMAGE STATUS\n')
  console.log('='.repeat(70))
  console.log(`\nTotal products: ${stats.total}`)
  console.log(`\n✅ Real product images:`)
  console.log(`   Amazon: ${stats.amazon} (${((stats.amazon/stats.total)*100).toFixed(1)}%)`)
  console.log(`   Walmart: ${stats.walmart} (${((stats.walmart/stats.total)*100).toFixed(1)}%)`)
  console.log(`\n📸 Stock photos:`)
  console.log(`   Unsplash: ${stats.unsplash} (${((stats.unsplash/stats.total)*100).toFixed(1)}%)`)
  console.log(`\n📦 Other:`)
  console.log(`   Placeholder: ${stats.placeholder} (${((stats.placeholder/stats.total)*100).toFixed(1)}%)`)
  console.log(`   No image: ${stats.none} (${((stats.none/stats.total)*100).toFixed(1)}%)`)
  
  const realImages = stats.amazon + stats.walmart
  console.log(`\n🎯 TOTAL REAL PRODUCT IMAGES: ${realImages}/${stats.total} (${((realImages/stats.total)*100).toFixed(1)}%)`)
  console.log('\n' + '='.repeat(70))
}

countImages()
