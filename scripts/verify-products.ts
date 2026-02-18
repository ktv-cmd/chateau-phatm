import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface VerificationResult {
  passed: boolean
  message: string
  details?: any
}

async function verifyTotalCount(): Promise<VerificationResult> {
  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    return { passed: false, message: '❌ Failed to count products', details: error }
  }
  
  if (count && count > 0) {
    return { 
      passed: true, 
      message: `✅ Total products: ${count}`,
      details: { count }
    }
  }
  
  return { passed: false, message: '❌ No products found in database' }
}

async function verifyProductStructure(): Promise<VerificationResult> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(5)
  
  if (error) {
    return { passed: false, message: '❌ Failed to fetch sample products', details: error }
  }
  
  if (!data || data.length === 0) {
    return { passed: false, message: '❌ No sample products found' }
  }
  
  // Check required fields
  const requiredFields = ['id', 'name', 'category', 'price_display']
  const missingFields: string[] = []
  
  data.forEach((product, index) => {
    requiredFields.forEach(field => {
      if (!product[field]) {
        missingFields.push(`Product ${index}: missing ${field}`)
      }
    })
  })
  
  if (missingFields.length > 0) {
    return { 
      passed: false, 
      message: '❌ Some products have missing required fields',
      details: missingFields.slice(0, 10)
    }
  }
  
  return { 
    passed: true, 
    message: '✅ All products have required fields',
    details: { sampleCount: data.length }
  }
}

async function verifyPrices(): Promise<VerificationResult> {
  const { data, error } = await supabase
    .from('products')
    .select('name, price_display, price_cents')
    .not('price_cents', 'is', null)
    .limit(10)
  
  if (error) {
    return { passed: false, message: '❌ Failed to check prices', details: error }
  }
  
  if (!data || data.length === 0) {
    return { passed: false, message: '⚠️  No products with price_cents found' }
  }
  
  // Verify price_cents matches price_display
  const mismatchedPrices: string[] = []
  
  data.forEach(product => {
    const displayPrice = parseFloat(product.price_display.replace(/[$,]/g, ''))
    const centsPrice = product.price_cents / 100
    
    if (Math.abs(displayPrice - centsPrice) > 0.01) {
      mismatchedPrices.push(
        `${product.name}: display=$${displayPrice}, cents=$${centsPrice}`
      )
    }
  })
  
  if (mismatchedPrices.length > 0) {
    return { 
      passed: false, 
      message: '❌ Some products have mismatched prices',
      details: mismatchedPrices
    }
  }
  
  return { 
    passed: true, 
    message: `✅ Prices are consistent (checked ${data.length} products)`,
    details: { sampleCount: data.length }
  }
}

async function verifySKUs(): Promise<VerificationResult> {
  const { data, error } = await supabase
    .from('products')
    .select('sku')
    .not('sku', 'is', null)
  
  if (error) {
    return { passed: false, message: '❌ Failed to check SKUs', details: error }
  }
  
  if (!data || data.length === 0) {
    return { passed: false, message: '⚠️  No products with SKUs found' }
  }
  
  // Check for duplicate SKUs
  const skuCounts: Record<string, number> = {}
  data.forEach(product => {
    if (product.sku) {
      skuCounts[product.sku] = (skuCounts[product.sku] || 0) + 1
    }
  })
  
  const duplicates = Object.entries(skuCounts)
    .filter(([_, count]) => count > 1)
    .map(([sku, count]) => `${sku} (${count} times)`)
  
  if (duplicates.length > 0) {
    return { 
      passed: false, 
      message: '❌ Duplicate SKUs found',
      details: duplicates.slice(0, 10)
    }
  }
  
  return { 
    passed: true, 
    message: `✅ All SKUs are unique (${data.length} products with SKUs)`,
    details: { skuCount: data.length }
  }
}

async function verifyCategories(): Promise<VerificationResult> {
  const { data, error } = await supabase
    .from('products')
    .select('category')
  
  if (error) {
    return { passed: false, message: '❌ Failed to check categories', details: error }
  }
  
  if (!data || data.length === 0) {
    return { passed: false, message: '❌ No products found' }
  }
  
  // Count products per category
  const categoryCounts: Record<string, number> = {}
  data.forEach(product => {
    categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1
  })
  
  const categoryList = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `  - ${cat}: ${count}`)
  
  return { 
    passed: true, 
    message: `✅ Products distributed across ${Object.keys(categoryCounts).length} categories`,
    details: categoryList
  }
}

async function verifyActiveStatus(): Promise<VerificationResult> {
  const { data, error } = await supabase
    .from('products')
    .select('is_active')
  
  if (error) {
    return { passed: false, message: '❌ Failed to check active status', details: error }
  }
  
  if (!data || data.length === 0) {
    return { passed: false, message: '❌ No products found' }
  }
  
  const activeCount = data.filter(p => p.is_active === true).length
  const inactiveCount = data.filter(p => p.is_active === false).length
  
  return { 
    passed: true, 
    message: `✅ Active status: ${activeCount} active, ${inactiveCount} inactive`,
    details: { active: activeCount, inactive: inactiveCount }
  }
}

async function verifySampleProducts(): Promise<VerificationResult> {
  const { data, error } = await supabase
    .from('products')
    .select('name, brand, category, price_display, sku')
    .order('name')
    .limit(10)
  
  if (error) {
    return { passed: false, message: '❌ Failed to fetch sample products', details: error }
  }
  
  if (!data || data.length === 0) {
    return { passed: false, message: '❌ No products found' }
  }
  
  const sampleList = data.map((p, i) => 
    `  ${i + 1}. ${p.name}\n     Brand: ${p.brand || 'N/A'} | Category: ${p.category} | Price: ${p.price_display} | SKU: ${p.sku || 'N/A'}`
  )
  
  return { 
    passed: true, 
    message: `✅ Sample products (first 10):`,
    details: sampleList
  }
}

async function verifyPriceRange(): Promise<VerificationResult> {
  const { data, error } = await supabase
    .from('products')
    .select('price_cents')
    .not('price_cents', 'is', null)
  
  if (error) {
    return { passed: false, message: '❌ Failed to check price range', details: error }
  }
  
  if (!data || data.length === 0) {
    return { passed: false, message: '⚠️  No products with prices found' }
  }
  
  const prices = data.map(p => p.price_cents).sort((a, b) => a - b)
  const min = prices[0] / 100
  const max = prices[prices.length - 1] / 100
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length / 100
  
  return { 
    passed: true, 
    message: `✅ Price range: $${min.toFixed(2)} - $${max.toFixed(2)} (avg: $${avg.toFixed(2)})`,
    details: { min, max, avg, count: prices.length }
  }
}

async function main() {
  console.log('🔍 Starting Products Verification\n')
  console.log('='.repeat(70))
  
  const checks = [
    { name: 'Total Product Count', fn: verifyTotalCount },
    { name: 'Product Structure', fn: verifyProductStructure },
    { name: 'Prices Validation', fn: verifyPrices },
    { name: 'SKU Uniqueness', fn: verifySKUs },
    { name: 'Categories Distribution', fn: verifyCategories },
    { name: 'Active Status', fn: verifyActiveStatus },
    { name: 'Price Range Analysis', fn: verifyPriceRange },
    { name: 'Sample Products', fn: verifySampleProducts },
  ]
  
  let passedCount = 0
  let failedCount = 0
  
  for (const check of checks) {
    console.log(`\n📋 ${check.name}:`)
    try {
      const result = await check.fn()
      console.log(result.message)
      
      if (result.details) {
        if (Array.isArray(result.details)) {
          result.details.forEach(detail => console.log(detail))
        } else if (typeof result.details === 'object') {
          console.log(JSON.stringify(result.details, null, 2))
        }
      }
      
      if (result.passed) {
        passedCount++
      } else {
        failedCount++
      }
    } catch (error) {
      console.error(`❌ Check failed with error:`, error)
      failedCount++
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Verification Summary:`)
  console.log(`   ✅ Passed: ${passedCount}/${checks.length}`)
  console.log(`   ❌ Failed: ${failedCount}/${checks.length}`)
  
  if (failedCount === 0) {
    console.log('\n🎉 All verification checks passed!')
  } else {
    console.log('\n⚠️  Some verification checks failed. Please review the details above.')
  }
  
  console.log('='.repeat(70))
}

main()
