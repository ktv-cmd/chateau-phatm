import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type ProductRow = {
  id: string
  name: string
  base_product_name: string | null
  variant_size: string | null
}

function sizeKey(row: ProductRow): string {
  return (row.variant_size || 'Standard').trim().toLowerCase()
}

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,base_product_name,variant_size')
    .order('name')

  if (error || !data) {
    console.error('Failed to fetch products:', error?.message)
    process.exit(1)
  }

  const products = data as ProductRow[]
  const totalProducts = products.length

  const groups = new Map<string, ProductRow[]>()
  for (const product of products) {
    const key = (product.base_product_name || product.name).trim()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(product)
  }

  const totalGroups = groups.size
  let groupsWithMultipleVariants = 0
  let groupsWithDifferentSizes = 0
  let totalVariantsInGroups = 0

  for (const [, rows] of groups) {
    if (rows.length > 1) {
      groupsWithMultipleVariants += 1
      totalVariantsInGroups += rows.length

      const sizes = new Set(rows.map(sizeKey))
      if (sizes.size > 1) {
        groupsWithDifferentSizes += 1
      }
    }
  }

  console.log('--- PRODUCT COUNTS ---')
  console.log(`Total products (rows): ${totalProducts}`)
  console.log(`Total cards (grouped): ${totalGroups}`)
  console.log(`Combined products (2+ variants): ${groupsWithMultipleVariants}`)
  console.log(`Combined with different sizes: ${groupsWithDifferentSizes}`)
  console.log(`Total variant rows inside combined groups: ${totalVariantsInGroups}`)
}

run()
