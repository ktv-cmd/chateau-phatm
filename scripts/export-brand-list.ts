import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

type ProductRow = {
  brand: string | null
  name: string
}

async function run() {
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

  const { data, error } = await supabase
    .from('products')
    .select('brand, name')

  if (error) {
    console.error('Failed to fetch products:', error.message)
    process.exit(1)
  }

  const groups = new Map<string, { count: number; examples: string[] }>()

  ;(data as ProductRow[]).forEach(product => {
    const brand = product.brand?.trim() || 'Unknown'
    const entry = groups.get(brand) || { count: 0, examples: [] }
    entry.count += 1
    if (entry.examples.length < 3) {
      entry.examples.push(product.name)
    }
    groups.set(brand, entry)
  })

  const sorted = Array.from(groups.entries()).sort((a, b) => b[1].count - a[1].count)

  const lines = ['brand,count,examples']
  sorted.forEach(([brand, info]) => {
    const examples = info.examples.join(' | ').replace(/"/g, '""')
    lines.push(`"${brand.replace(/"/g, '""')}",${info.count},"${examples}"`)
  })

  const outputPath = path.join(process.cwd(), 'docs', 'brand-list.csv')
  fs.writeFileSync(outputPath, lines.join('\n'))

  console.log(`Brand list written to ${outputPath}`)
}

run()
