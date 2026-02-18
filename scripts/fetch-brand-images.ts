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
    const options = { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    https.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(null) }
      })
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null))
  })
}

// Popular brands to prioritize
const BRAND_SEARCH_TERMS: Record<string, string> = {
  'ADVIL': 'advil ibuprofen tablets',
  'TYLENOL': 'tylenol acetaminophen tablets',
  'MOTRIN': 'motrin ibuprofen',
  'NEOSPORIN': 'neosporin antibiotic ointment',
  'BANDAID': 'band-aid bandages',
  'BENADRYL': 'benadryl antihistamine',
  'CETAPHIL': 'cetaphil cleanser',
  'CERAVE': 'cerave moisturizer',
  'ALLEGRA': 'allegra allergy',
  'CLARITIN': 'claritin allergy',
  'ZYRTEC': 'zyrtec allergy',
  'MUCINEX': 'mucinex expectorant',
  'PEPTO': 'pepto bismol',
  'IMODIUM': 'imodium',
  'ASPIRIN': 'aspirin tablets',
  'BAYER': 'bayer aspirin',
  'AFRIN': 'afrin nasal spray',
  'FLONASE': 'flonase nasal spray',
  'EXCEDRIN': 'excedrin migraine',
  'ALEVE': 'aleve naproxen',
  'BACITRACIN': 'bacitracin ointment',
  'HYDROCORTISONE': 'hydrocortisone cream',
  'LUBRIDERM': 'lubriderm lotion',
  'CARMEX': 'carmex lip balm',
  'CHAPSTICK': 'chapstick',
  'VASELINE': 'vaseline petroleum jelly',
  'AQUAPHOR': 'aquaphor healing ointment',
  'CORTIZONE': 'cortizone-10 cream',
  'CAMPHO-PHENIQUE': 'campho phenique',
  'CHLORASEPTIC': 'chloraseptic spray',
  'HALLS': 'halls cough drops',
  'RICOLA': 'ricola cough drops',
  'SUDAFED': 'sudafed decongestant',
  'DELSYM': 'delsym cough',
  'ROBITUSSIN': 'robitussin cough',
  'NYQUIL': 'nyquil cold flu',
  'DAYQUIL': 'dayquil cold flu',
  'VICKS': 'vicks vaporub',
  'BENGAY': 'bengay pain relief',
  'BIOFREEZE': 'biofreeze gel',
  'ICY HOT': 'icy hot cream',
  'SALONPAS': 'salonpas pain patch',
  'TUMS': 'tums antacid',
  'COLACE': 'colace stool softener',
  'MIRALAX': 'miralax laxative',
  'SENOKOT': 'senokot laxative',
  'DULCOLAX': 'dulcolax laxative',
  'PREPARATION H': 'preparation h',
  'ANBESOL': 'anbesol oral gel',
  'ORAJEL': 'orajel gel',
  'POLIDENT': 'polident denture',
  'FIXODENT': 'fixodent denture',
  'SENSODYNE': 'sensodyne toothpaste',
  'LISTERINE': 'listerine mouthwash',
  'VISINE': 'visine eye drops',
  'CLEAR EYES': 'clear eyes drops',
  'SYSTANE': 'systane eye drops',
  'REFRESH': 'refresh eye drops',
  'DEBROX': 'debrox ear drops',
}

async function searchForBrandImage(brand: string): Promise<string | null> {
  const searchTerm = BRAND_SEARCH_TERMS[brand.toUpperCase()]
  if (!searchTerm) return null
  
  try {
    const url = `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(searchTerm)}`
    const data = await httpsGet(url)
    
    if (data?.items?.length > 0) {
      for (const item of data.items) {
        if (item.images && item.images.length > 0) {
          return item.images[0]
        }
      }
    }
  } catch {}
  
  return null
}

function extractBrand(productName: string): string | null {
  const upperName = productName.toUpperCase()
  
  // Check each known brand
  for (const brand of Object.keys(BRAND_SEARCH_TERMS)) {
    if (upperName.includes(brand)) {
      return brand
    }
  }
  
  return null
}

async function main() {
  console.log('🎨 Fetching Brand Images\n')
  console.log('='.repeat(70))
  console.log(`Targeting ${Object.keys(BRAND_SEARCH_TERMS).length} popular brands\n`)
  
  // Get products that need images
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, brand, image_url')
    .order('name')
  
  if (error || !products) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`✅ Found ${products.length} total products\n`)
  
  const stats = {
    checked: 0,
    updated: 0,
    skipped: 0
  }
  
  // Group by brand for efficient API usage
  const brandCache: Record<string, string | null> = {}
  
  for (const product of products) {
    const brand = extractBrand(product.name)
    
    if (!brand) {
      stats.skipped++
      continue
    }
    
    stats.checked++
    
    // Check cache first
    if (!(brand in brandCache)) {
      console.log(`🔍 Searching for ${brand}...`)
      const imageUrl = await searchForBrandImage(brand)
      brandCache[brand] = imageUrl
      
      if (imageUrl) {
        console.log(`   ✅ Found image for ${brand}`)
      } else {
        console.log(`   ❌ No image found for ${brand}`)
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    const imageUrl = brandCache[brand]
    
    if (imageUrl) {
      // Update product with brand image
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', product.id)
      
      if (!updateError) {
        stats.updated++
      }
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 Results:')
  console.log(`   Products checked: ${stats.checked}`)
  console.log(`   Updated with real images: ${stats.updated}`)
  console.log(`   Skipped (no brand match): ${stats.skipped}`)
  console.log(`   Unique brands found: ${Object.keys(brandCache).length}`)
  console.log('\n='.repeat(70))
}

main()
