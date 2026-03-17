import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface KinrayProduct {
  [key: string]: any
}

// Helper function to parse price string to cents
function parsePriceToCents(priceStr: string | number | undefined): number | null {
  if (!priceStr) return null
  
  const str = String(priceStr).trim()
  // Remove currency symbols and whitespace
  const cleaned = str.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  
  if (isNaN(num)) return null
  return Math.round(num * 100)
}

// Helper function to format price display
function formatPriceDisplay(priceStr: string | number | undefined): string {
  if (!priceStr) return 'Call for Price'
  
  const str = String(priceStr).trim()
  const cleaned = str.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  
  if (isNaN(num)) return 'Call for Price'
  return `$${num.toFixed(2)}`
}

// Helper function to clean and normalize text
function cleanText(text: any): string | null {
  if (!text) return null
  return String(text).trim() || null
}

// Helper function to determine category from product data
function determineCategory(row: KinrayProduct): string {
  // Look for category-related fields in the Excel sheet
  const categoryFields = ['Category', 'category', 'CATEGORY', 'Type', 'type', 'Product Type', 'Product_Type']
  
  for (const field of categoryFields) {
    if (row[field]) {
      return cleanText(row[field]) || 'Over-the-Counter'
    }
  }
  
  // Try to infer from product description
  const desc = String(row['Description'] || row['DESCRIPTION'] || '').toLowerCase()
  
  // Pain & Fever Relief
  if (desc.match(/\b(pain|analgesic|aspirin|ibuprofen|acetaminophen|tylenol|advil|motrin|aleve|naproxen|fever|headache)\b/)) {
    return 'Pain & Fever Relief'
  }
  
  // Cold, Flu & Sinus
  if (desc.match(/\b(cold|flu|cough|sinus|decongestant|expectorant|mucus|throat|robitussin|nyquil|dayquil|mucinex|sudafed)\b/)) {
    return 'Cold, Flu & Sinus'
  }
  
  // Allergy
  if (desc.match(/\b(allergy|allergic|antihistamine|benadryl|claritin|zyrtec|allegra|itch|hives)\b/)) {
    return 'Allergy'
  }
  
  // Digestive Health
  if (desc.match(/\b(digest|antacid|stomach|heartburn|acid|reflux|laxative|constipation|diarrhea|nausea|pepcid|tums|pepto|imodium|miralax|senokot|dulcolax|gas|bloat)\b/)) {
    return 'Digestive Health'
  }
  
  // Vitamins & Supplements
  if (desc.match(/\b(vitamin|supplement|multivitamin|calcium|iron|zinc|magnesium|omega|probiotic|fiber)\b/)) {
    return 'Vitamins & Supplements'
  }
  
  // Skin Care & Topicals
  if (desc.match(/\b(skin|lotion|cream|ointment|gel|petroleum|moisturizer|hydrocortisone|antibiotic|neosporin|bacitracin|rash|burn|sunburn|dry skin|eczema|psoriasis)\b/)) {
    return 'Skin Care & Topicals'
  }
  
  // First Aid
  if (desc.match(/\b(first aid|bandage|gauze|tape|wound|adhesive|band-aid|dressing|antiseptic|hydrogen peroxide|alcohol|swab)\b/)) {
    return 'First Aid'
  }
  
  // Eye & Ear Care
  if (desc.match(/\b(eye|ear|vision|hearing|drops|artificial tears|visine|clear eyes|earwax)\b/)) {
    return 'Eye & Ear Care'
  }
  
  // Oral Care
  if (desc.match(/\b(oral|mouth|tooth|teeth|dental|gum|breath|denture|mouthwash|toothache|orajel)\b/)) {
    return 'Oral Care'
  }
  
  // Sleep & Relaxation
  if (desc.match(/\b(sleep|insomnia|melatonin|zzzquil|unisom|nighttime|drowsy)\b/)) {
    return 'Sleep & Relaxation'
  }
  
  // Feminine Care
  if (desc.match(/\b(feminine|vaginal|yeast|monistat|period|menstrual|pms)\b/)) {
    return 'Feminine Care'
  }
  
  // Diabetes Care
  if (desc.match(/\b(diabetes|diabetic|glucose|blood sugar|insulin|test strip|lancet|meter)\b/)) {
    return 'Diabetes Care'
  }
  
  // Baby & Child Care
  if (desc.match(/\b(baby|infant|child|children|pediatric|kids)\b/)) {
    return 'Baby & Child Care'
  }
  
  return 'Over-the-Counter'
}

async function readExcelFile(filePath: string): Promise<KinrayProduct[]> {
  console.log(`📖 Reading Excel file: ${filePath}`)
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  
  console.log(`📄 Reading sheet: ${sheetName}`)
  
  const worksheet = workbook.Sheets[sheetName]
  
  // First, read all data including headers
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][]
  
  console.log(`✅ Found ${rawData.length} rows in Excel file`)
  
  // Log first few rows to understand structure
  if (rawData.length > 0) {
    console.log('\n📋 First 3 rows of raw data:')
    rawData.slice(0, 3).forEach((row, i) => {
      console.log(`   Row ${i}: ${JSON.stringify(row)}`)
    })
  }
  
  // Find the header row (look for row containing "Item Number" or "Description")
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i]
    const rowStr = JSON.stringify(row).toLowerCase()
    if (rowStr.includes('item') || rowStr.includes('description') || rowStr.includes('product')) {
      headerRowIndex = i
      break
    }
  }
  
  if (headerRowIndex === -1) {
    console.log('⚠️  Could not find header row, using first row as headers')
    headerRowIndex = 0
  } else {
    console.log(`✅ Found header row at index ${headerRowIndex}`)
  }
  
  const headers = rawData[headerRowIndex].map((h: any) => 
    h ? String(h).trim() : ''
  )
  console.log(`\n📋 Column headers: ${JSON.stringify(headers)}`)
  
  // Convert remaining rows to objects using the headers
  const data: KinrayProduct[] = []
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i]
    const obj: KinrayProduct = {}
    
    headers.forEach((header, index) => {
      if (header && row[index] !== undefined && row[index] !== null) {
        obj[header] = row[index]
      }
    })
    
    // Only add rows that have at least some data
    if (Object.keys(obj).length > 0) {
      data.push(obj)
    }
  }
  
  console.log(`✅ Parsed ${data.length} data rows`)
  
  if (data.length > 0) {
    console.log('\n📊 Sample parsed row:')
    console.log(JSON.stringify(data[0], null, 2))
  }
  
  return data
}

function mapKinrayProductToSchema(row: KinrayProduct, index: number): any {
  // Extract data from the KINRAY Excel file structure
  // Columns: "Item Number", "Description", "Current Retail Price Sell Unit"
  
  const itemNumber = row['Item Number'] || row['ITEM NUMBER'] || row['Item_Number']
  const description = row['Description'] || row['DESCRIPTION'] 
  const price = row['Current Retail Price Sell Unit'] || row['Price'] || row['PRICE']
  
  // Use the first Excel column ("Item Number") as the stable external item ID.
  // `products.id` is UUID in DB, so this value must live in `sku`.
  const sku = cleanText(itemNumber)
  
  // Product name is the description
  let name = cleanText(description)
  if (!name) {
    name = sku ? `Product ${sku}` : `Product ${index + 1}`
  }
  
  // Try to extract brand from the description
  // Many pharmaceutical products start with the brand name
  let brand: string | null = null
  if (name) {
    // Common pattern: "BRAND NAME - PRODUCT TYPE"
    const parts = name.split(/[-–—]/)[0].trim()
    // Extract first word(s) as potential brand
    const words = parts.split(/\s+/)
    if (words.length > 0 && words[0].length > 2) {
      brand = words[0]
    }
  }
  
  const category = determineCategory(row)
  const priceCents = parsePriceToCents(price)
  const priceDisplay = formatPriceDisplay(price)
  
  return {
    name,
    brand,
    category,
    description: name, // Use full name as description as well
    image_url: null, // No images in Excel, can be added later
    price_display: priceDisplay,
    price_cents: priceCents,
    sale_price_cents: null,
    in_stock: true, // Assume all products are in stock
    inventory_qty: null, // No inventory quantity in the Excel file
    is_active: true,
    is_featured: false,
    sku
  }
}

async function clearExistingProducts() {
  console.log('\n🗑️  Clearing existing products...')
  
  // Delete product images first (due to foreign key constraints)
  const { error: imagesError } = await supabase
    .from('product_images')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  if (imagesError) {
    console.error('❌ Error deleting product images:', imagesError)
  } else {
    console.log('✅ Cleared all product images')
  }
  
  // Delete all products
  const { error: productsError } = await supabase
    .from('products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  if (productsError) {
    console.error('❌ Error deleting products:', productsError)
    throw productsError
  }
  
  console.log('✅ Cleared all products')
}

async function insertProducts(products: any[]) {
  console.log(`\n📥 Inserting ${products.length} products...`)
  
  const batchSize = 50
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(products.length / batchSize)
    
    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`)
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select()
    
    if (error) {
      console.error(`❌ Error inserting batch ${batchNum}:`, error)
      errorCount += batch.length
    } else {
      successCount += data?.length || 0
      console.log(`✅ Successfully inserted batch ${batchNum} (${data?.length} products)`)
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log(`\n✅ Insertion complete: ${successCount} successful, ${errorCount} failed`)
  return { successCount, errorCount }
}

async function verifyProducts() {
  console.log('\n🔍 Verifying products in database...')
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price_display, sku')
    .order('name')
  
  if (error) {
    console.error('❌ Error querying products:', error)
    return
  }
  
  console.log(`\n📊 Total products in database: ${data?.length || 0}`)
  
  if (data && data.length > 0) {
    // Show category breakdown
    const categoryCount = data.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n📈 Products by category:')
    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`)
      })
    
    // Show first 5 products
    console.log('\n📋 Sample products:')
    data.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (${p.category}) - ${p.price_display}`)
    })
  }
}

async function main() {
  console.log('🚀 Starting KINRAY Products Migration\n')
  console.log('=' .repeat(60))
  
  try {
    // Path to the Excel file
    const excelPath = path.join(process.cwd(), 'OTC LIST FOR APPFROM KINRAY.xlsx')
    
    // Step 1: Read Excel file
    const kinrayData = await readExcelFile(excelPath)
    
    if (kinrayData.length === 0) {
      console.error('❌ No data found in Excel file')
      process.exit(1)
    }
    
    // Step 2: Map to product schema
    console.log('\n🔄 Mapping products to database schema...')
    const products = kinrayData.map((row, index) => mapKinrayProductToSchema(row, index))
    
    // Require both name and Item Number (stored as SKU) so each item has a stable ID.
    const validProducts = products.filter(p => p.name && p.sku)
    const skippedProducts = products.length - validProducts.length
    console.log(`✅ Mapped ${validProducts.length} valid products`)
    if (skippedProducts > 0) {
      console.log(`⚠️  Skipped ${skippedProducts} rows missing Item Number or name`)
    }
    
    // Show sample mapped product
    if (validProducts.length > 0) {
      console.log('\n📋 Sample mapped product:')
      console.log(JSON.stringify(validProducts[0], null, 2))
    }
    
    // Step 3: Clear existing products
    await clearExistingProducts()
    
    // Step 4: Insert new products
    const { successCount, errorCount } = await insertProducts(validProducts)
    
    // Step 5: Verify
    await verifyProducts()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Migration completed!')
    console.log(`   Total processed: ${kinrayData.length}`)
    console.log(`   Valid products: ${validProducts.length}`)
    console.log(`   Successfully inserted: ${successCount}`)
    console.log(`   Failed: ${errorCount}`)
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
