import * as dotenv from 'dotenv'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

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
          resolve({ raw: data, status: res.statusCode })
        }
      })
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')))
  })
}

async function searchForAcetaminophen() {
  console.log('🔍 Searching for ACETAMINOPHEN TB 325MG 100 RS\n')
  console.log('='.repeat(70))
  
  const productName = 'ACETAMINOPHEN TB 325MG 100 RS'
  const searchTerm = 'acetaminophen 325mg tablets'
  
  // Try 1: Google Product Search (via SerpAPI free alternative)
  console.log('\n📍 Method 1: Searching via product name...')
  try {
    // UPCitemdb search by query
    const url = `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(searchTerm)}`
    console.log(`   Trying: ${url}`)
    const data = await httpsGet(url)
    
    if (data?.items?.length > 0) {
      console.log(`\n✅ Found ${data.items.length} results from UPCitemdb:`)
      data.items.slice(0, 3).forEach((item: any, i: number) => {
        console.log(`\n   Result ${i + 1}:`)
        console.log(`   Title: ${item.title}`)
        console.log(`   Brand: ${item.brand}`)
        if (item.images && item.images.length > 0) {
          console.log(`   Image: ${item.images[0]}`)
        }
        if (item.upc) {
          console.log(`   UPC: ${item.upc}`)
        }
      })
    } else {
      console.log('   ❌ No results found')
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error: ${error.message}`)
  }
  
  // Try 2: NIH RxImage via DailyMed
  console.log('\n📍 Method 2: DailyMed search...')
  try {
    const url = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=acetaminophen`
    console.log(`   Trying: ${url}`)
    const data = await httpsGet(url)
    
    if (data?.data?.length > 0) {
      console.log(`\n✅ Found ${data.data.length} results from DailyMed:`)
      const acetaminophenProducts = data.data.filter((item: any) => 
        item.title?.toLowerCase().includes('325')
      ).slice(0, 3)
      
      acetaminophenProducts.forEach((item: any, i: number) => {
        console.log(`\n   Result ${i + 1}:`)
        console.log(`   Title: ${item.title}`)
        if (item.splimage) {
          console.log(`   Image: https://dailymed.nlm.nih.gov${item.splimage}`)
        }
      })
    } else {
      console.log('   ❌ No results found')
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error: ${error.message}`)
  }
  
  // Try 3: Generic suggestions
  console.log('\n📍 Method 3: Generic image suggestions...')
  console.log('\n   You can use these free generic medicine images:')
  console.log('   1. https://cdn.pixabay.com/photo/2016/03/26/13/09/tablets-1280853_1280.jpg')
  console.log('   2. https://cdn.pixabay.com/photo/2017/08/10/15/34/pills-2621098_1280.jpg')
  console.log('   3. https://cdn.pixabay.com/photo/2016/11/29/12/54/pills-1869775_1280.jpg')
  console.log('   4. https://images.unsplash.com/photo-1584308666744-24d5c474f2ae (medicine pills)')
  
  console.log('\n📍 Method 4: Search manually on:')
  console.log('   • https://commons.wikimedia.org (free, public domain)')
  console.log('   • https://pixabay.com (free for commercial use)')
  console.log('   • https://unsplash.com (free for commercial use)')
  console.log('   • https://www.pexels.com (free for commercial use)')
  console.log('   Search term: "acetaminophen tablets" or "paracetamol pills"')
  
  console.log('\n' + '='.repeat(70))
}

searchForAcetaminophen()
