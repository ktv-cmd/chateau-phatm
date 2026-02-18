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

async function addColumns() {
  console.log('🔧 Adding variant columns to products table...\n')
  
  const sql = `
-- Add variant fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS base_product_name TEXT,
ADD COLUMN IF NOT EXISTS variant_size TEXT;

-- Create index for better performance when grouping
CREATE INDEX IF NOT EXISTS idx_products_base_name ON public.products(base_product_name);
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // Try alternative approach - use raw SQL
      console.log('Trying direct SQL execution...')
      // Since RPC might not work, let's just log the SQL for manual execution
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:\n')
      console.log(sql)
      console.log('\nOr add the columns via Supabase Dashboard:')
      console.log('1. Go to Table Editor → products')
      console.log('2. Add column: base_product_name (type: text)')
      console.log('3. Add column: variant_size (type: text)')
    } else {
      console.log('✅ Columns added successfully!')
    }
  } catch (err) {
    console.log('\n📋 SQL to run manually in Supabase:')
    console.log('='.repeat(70))
    console.log(sql)
    console.log('='.repeat(70))
  }
}

addColumns()
