import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

async function test() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, display_name')
    .limit(1)
  
  if (error) {
    console.log('❌ Error:', error.message)
    console.log('\nThe display_name column does not exist yet.')
    console.log('\nPlease run this SQL in Supabase SQL Editor:')
    console.log('\nALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_name TEXT;')
  } else {
    console.log('✅ Column exists!')
    console.log('Data:', data)
  }
}

test()
