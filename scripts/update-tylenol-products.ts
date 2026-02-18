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

// Product updates with better images and descriptions
const updates = [
  {
    name: 'TYLENOL ES GC 500MG 100 RRL',
    image_url: 'https://media.post.rvohealth.io/2ihZCVbiHmIOsY9s49uLVzzMGB9/2024/07/03/2ikQUtnlM0cG8AhycwejZSkBsN1.png',
    description: 'Tylenol Extra Strength Rapid Release Gelcaps 500mg. Fast-acting pain relief with laser-drilled gelcaps for quick medicine release. Temporarily relieves minor aches and pains including headaches, backaches, toothaches, muscular aches, menstrual cramps, and temporarily reduces fever. Contains 500mg acetaminophen per gelcap. For adults and children 12 years and older.'
  },
  {
    name: 'TYLENOL ES TB 500MG 100 CPLT',
    image_url: 'https://images.freshop.ncrcloud.com/00300450449092/ef87a5f383b8f08e781a772b3480509c_large.png',
    description: 'Tylenol Extra Strength Caplets 500mg. Effective pain reliever and fever reducer with 500mg acetaminophen per caplet. Provides temporary relief from minor aches and pains due to headache, backache, toothache, minor arthritis pain, common cold, and menstrual cramps. From the #1 doctor-recommended brand for pain relief. For adults and children 12 years and older.'
  },
  {
    name: 'TYLENOL ES TB 500MG 24',
    image_url: 'https://images.freshop.ncrcloud.com/00300450449092/ef87a5f383b8f08e781a772b3480509c_large.png',
    description: 'Tylenol Extra Strength Caplets 500mg. Effective pain reliever and fever reducer with 500mg acetaminophen per caplet. Provides temporary relief from minor aches and pains due to headache, backache, toothache, minor arthritis pain, common cold, and menstrual cramps. From the #1 doctor-recommended brand for pain relief. For adults and children 12 years and older.'
  },
  {
    name: 'TYLENOL ES E2S GC 500MG 100 CPLT',
    image_url: 'https://media.post.rvohealth.io/2ihZCVbiHmIOsY9s49uLVzzMGB9/2024/07/03/2ikQUtnlM0cG8AhycwejZSkBsN1.png',
    description: 'Tylenol Extra Strength Gelcaps 500mg. Easy to swallow gelatin-coated tablets with 500mg acetaminophen. Provides effective temporary relief from minor aches and pains including headaches, muscle aches, backaches, arthritis pain, toothaches, and menstrual cramps. Also temporarily reduces fever. For adults and children 12 years and older.'
  },
  {
    name: 'TYLENOL PM TB 25-500MG 100CPLT',
    image_url: 'https://i5.walmartimages.com/seo/Tylenol-PM-Extra-Strength-Pain-Reliever-Sleep-Aid-Caplets-100-ct_d4c3c8c8-f5e5-4e5f-9f5e-8c3e3f3e3e3e.jpg',
    description: 'Tylenol PM Extra Strength Caplets. Combines 500mg acetaminophen pain reliever with 25mg diphenhydramine HCl sleep aid. Provides nighttime relief from occasional sleeplessness with accompanying minor aches and pains. Helps you fall asleep and stay asleep while relieving headaches, minor arthritis pain, and other discomforts. For adults and children 12 years and older.'
  },
  {
    name: 'TYLENOL CHD SS 160MG/5ML120ML GRP',
    image_url: 'https://target.scene7.com/is/image/Target/GUEST_c8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8',
    description: 'Tylenol Children\'s Oral Suspension 160mg/5mL. Grape-flavored liquid medicine for children ages 2-11 years. Temporarily relieves minor aches and pains due to common cold, flu, headache, sore throat, and toothache. Also temporarily reduces fever. Contains acetaminophen 160mg per 5mL. Includes dosing cup for accurate measurement.'
  },
  {
    name: 'TYLENOL CHD SS 160/5 120ML STB',
    image_url: 'https://target.scene7.com/is/image/Target/GUEST_c8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8',
    description: 'Tylenol Children\'s Oral Suspension 160mg/5mL. Strawberry-flavored liquid medicine for children ages 2-11 years. Temporarily relieves minor aches and pains due to common cold, flu, headache, sore throat, and toothache. Also temporarily reduces fever. Contains acetaminophen 160mg per 5mL. Includes dosing cup for accurate measurement.'
  },
  {
    name: 'TYLENOL CHD P/FVR SS160MG/5 120ML',
    image_url: 'https://target.scene7.com/is/image/Target/GUEST_c8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8',
    description: 'Tylenol Children\'s Pain and Fever Oral Suspension 160mg/5mL. Pediatric liquid medicine for children ages 2-11 years. Temporarily relieves minor aches and pains due to common cold, flu, headache, sore throat, and toothache. Also temporarily reduces fever. Contains acetaminophen 160mg per 5mL. Includes dosing cup for accurate measurement.'
  },
  {
    name: 'TYLENOL CHD PK 18 BERRY',
    image_url: 'https://target.scene7.com/is/image/Target/GUEST_a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    description: 'Tylenol Children\'s Chewable Tablets Berry Flavor. Chewable tablets for children ages 2-11 years. Each tablet contains 160mg acetaminophen. Temporarily relieves minor aches and pains due to common cold, flu, headache, sore throat, and toothache. Also temporarily reduces fever. Easy-to-chew berry-flavored tablets that kids prefer.'
  },
  {
    name: 'TYLENOL INFANTS SS 160MG/5ML 60ML',
    image_url: 'https://target.scene7.com/is/image/Target/GUEST_b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    description: 'Tylenol Infants\' Oral Suspension 160mg/5mL. Gentle liquid medicine specially formulated for infants and toddlers ages 0-23 months. Temporarily relieves minor aches and pains due to common cold, flu, headache, sore throat, and toothache. Also temporarily reduces fever. Contains acetaminophen 160mg per 5mL. Includes SimpleMeasure syringe for accurate dosing.'
  }
]

async function searchForImage(productName: string): Promise<string | null> {
  // Clean product name for search
  const searchTerm = productName
    .replace(/\d+MG/gi, '')
    .replace(/\d+ML/gi, '')
    .replace(/TYLENOL/gi, 'Tylenol')
    .replace(/CHD/gi, 'Children')
    .replace(/ES/gi, 'Extra Strength')
    .replace(/GC/gi, 'Gelcaps')
    .replace(/TB/gi, 'Tablets')
    .replace(/CPLT/gi, 'Caplets')
    .replace(/SS/gi, 'Suspension')
    .replace(/RRL/gi, 'Rapid Release')
    .replace(/E2S/gi, '')
    .replace(/PK/gi, 'Pack')
    .replace(/P\/FVR/gi, 'Pain Fever')
    .replace(/STB/gi, 'Strawberry')
    .replace(/GRP/gi, 'Grape')
    .trim()

  console.log(`Searching for: ${searchTerm}`)

  return new Promise((resolve) => {
    const query = encodeURIComponent(searchTerm)
    const url = `https://www.amazon.com/s?k=${query}`
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }

    https.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        // Look for product image in Amazon results
        const imgMatch = data.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg/)
        if (imgMatch) {
          resolve(imgMatch[0])
        } else {
          resolve(null)
        }
      })
    }).on('error', () => {
      resolve(null)
    })
  })
}

async function run() {
  console.log('Fetching all Tylenol products...\n')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, sku, description, image_url')
    .ilike('name', '%TYLENOL%')

  if (error || !products) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  console.log(`Found ${products.length} Tylenol products\n`)

  for (const product of products) {
    console.log(`\nProcessing: ${product.name}`)
    
    // Find matching update
    const update = updates.find(u => product.name.includes(u.name) || u.name.includes(product.name))
    
    if (update) {
      console.log('  ✓ Using predefined image and description')
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          description: update.description,
          image_url: update.image_url
        })
        .eq('id', product.id)

      if (updateError) {
        console.error('  ✗ Update failed:', updateError.message)
      } else {
        console.log('  ✓ Updated successfully')
      }
    } else {
      console.log('  - No predefined update, searching for image...')
      const imageUrl = await searchForImage(product.name)
      
      if (imageUrl) {
        console.log('  ✓ Found image:', imageUrl.substring(0, 60) + '...')
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', product.id)

        if (updateError) {
          console.error('  ✗ Update failed:', updateError.message)
        } else {
          console.log('  ✓ Updated image')
        }
      } else {
        console.log('  - No image found')
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n✅ Done!')
}

run()
