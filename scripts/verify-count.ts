import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
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

async function countExcelProducts(): Promise<number> {
  const excelPath = path.join(process.cwd(), 'OTC LIST FOR APPFROM KINRAY.xlsx')
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`File not found: ${excelPath}`)
  }
  
  const workbook = XLSX.readFile(excelPath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Read all data as rows
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][]
  
  // Find header row
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i]
    const rowStr = JSON.stringify(row).toLowerCase()
    if (rowStr.includes('item') || rowStr.includes('description')) {
      headerRowIndex = i
      break
    }
  }
  
  if (headerRowIndex === -1) {
    headerRowIndex = 0
  }
  
  // Count data rows (excluding header and empty rows)
  let dataRowCount = 0
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i]
    // Check if row has any data
    const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '')
    if (hasData) {
      dataRowCount++
    }
  }
  
  return dataRowCount
}

async function countDatabaseProducts(): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }
  
  return count || 0
}

async function main() {
  console.log('🔍 Counting Products\n')
  console.log('='.repeat(60))
  
  try {
    console.log('📄 Counting products in Excel file...')
    const excelCount = await countExcelProducts()
    console.log(`   Excel file: ${excelCount} products`)
    
    console.log('\n💾 Counting products in database...')
    const dbCount = await countDatabaseProducts()
    console.log(`   Database: ${dbCount} products`)
    
    console.log('\n' + '='.repeat(60))
    
    if (excelCount === dbCount) {
      console.log('✅ PERFECT MATCH!')
      console.log(`   ${excelCount} products in Excel = ${dbCount} products in database`)
    } else {
      console.log('❌ MISMATCH DETECTED!')
      console.log(`   Excel: ${excelCount} products`)
      console.log(`   Database: ${dbCount} products`)
      console.log(`   Difference: ${Math.abs(excelCount - dbCount)} products`)
      
      if (excelCount > dbCount) {
        console.log(`   ⚠️  ${excelCount - dbCount} products were NOT imported`)
      } else {
        console.log(`   ⚠️  ${dbCount - excelCount} extra products in database`)
      }
      process.exit(1)
    }
    
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  }
}

main()
