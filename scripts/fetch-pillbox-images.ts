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
    https.get(url, { timeout: 10000 }, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(null) }
      })
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null))
  })
}

// Extract drug name for Pillbox API
function extractDrugName(productName: string): string | null {
  const name = productName.toUpperCase()
  
  // List of common drug names to search for
  const commonDrugs = [
    'ACETAMINOPHEN', 'IBUPROFEN', 'ASPIRIN', 'NAPROXEN',
    'DIPHENHYDRAMINE', 'LORATADINE', 'CETIRIZINE', 'FEXOFENADINE',
    'OMEPRAZOLE', 'RANITIDINE', 'FAMOTIDINE',
    'GUAIFENESIN', 'DEXTROMETHORPHAN', 'PSEUDOEPHEDRINE',
    'LOPERAMIDE', 'BISMUTH', 'DOCUSATE', 'SENNOSIDES', 'BISACODYL',
    'HYDROCORTISONE', 'BACITRACIN', 'NEOMYCIN',
    'CLEMASTINE', 'MECLIZINE', 'DIMENHYDRINATE',
  ]
  
  for (const drug of commonDrugs) {
    if (name.includes(drug)) {
      return drug.toLowerCase()
    }
  }
  
  return null
}

async function searchPillbox(drugName: string): Promise<string | null> {
  try {
    // Pillbox API endpoint (if available)
    // Note: The actual API endpoint may vary
    const url = `https://pillbox.nlm.nih.gov/PHP/pillboxAPIService.php?key=1&ingredient=${encodeURIComponent(drugName)}`
    const data = await httpsGet(url)
    
    if (data && Array.isArray(data) && data.length > 0) {
      // Check if result has image
      for (const pill of data) {
        if (pill.image_id || pill.imageUrl) {
          const imageUrl = pill.imageUrl || `https://pillbox.nlm.nih.gov/assets/medium/${pill.image_id}.jpg`
          return imageUrl
        }
      }
    }
  } catch {}
  
  return null
}

async function main() {
  console.log('💊 Fetching Images from Pillbox Database\n')
  console.log('='.repeat(70))
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, category')
    .or('category.eq.Pain & Fever Relief,category.eq.Allergy,category.eq.Digestive Health,category.eq.Cold, Flu & Sinus')
    .order('name')
  
  if (error || !products) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`✅ Found ${products.length} pharmaceutical products`)
  console.log('🔍 Searching Pillbox database...\n')
  
  const stats = { checked: 0, found: 0, notFound: 0 }
  
  for (const product of products) {
    const drugName = extractDrugName(product.name)
    
    if (!drugName) {
      stats.notFound++
      continue
    }
    
    stats.checked++
    console.log(`🔍 ${product.name.substring(0, 50)}...`)
    console.log(`   Drug: ${drugName}`)
    
    const imageUrl = await searchPillbox(drugName)
    
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', product.id)
      
      if (!updateError) {
        stats.found++
        console.log(`   ✅ Found Pillbox image`)
      }
    } else {
      console.log(`   ❌ No Pillbox image`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Results:`)
  console.log(`   Checked: ${stats.checked}`)
  console.log(`   Found: ${stats.found}`)
  console.log(`   Not found: ${stats.notFound}`)
  console.log('\n='.repeat(70))
}

main()
