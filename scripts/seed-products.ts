import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) return
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  })
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const products = [
  { name: 'Acetaminophen 500mg 100 ct', price: 7.0 },
  { name: 'Ibuprofen 200mg 100 ct', price: 12.0 },
  { name: 'Aspirin 325mg 100 ct', price: 6.0 },
  { name: 'Naproxen 220mg 100 ct', price: 14.0 },
  { name: 'Loratadine 10mg 30 ct', price: 13.0 },
  { name: 'Cetirizine 10mg 30 ct', price: 15.0 },
  { name: 'Fexofenadine 180mg 30 ct', price: 18.0 },
  { name: 'Diphenhydramine 25mg 25 ct', price: 9.0 },
  { name: 'Dextromethorphan Cough Syrup 8 fl oz', price: 10.0 },
  { name: 'Guaifenesin Expectorant 8 fl oz', price: 10.0 },
  { name: 'Saline Nasal Spray', price: 6.0 },
  { name: 'Nasal Decongestant Spray', price: 8.0 },
  { name: 'Antacid Chewables 100 ct', price: 7.0 },
  { name: 'Famotidine 10mg 25 ct', price: 10.0 },
  { name: 'Omeprazole 20mg 14 ct', price: 18.0 },
  { name: 'Pepcid Complete 20 ct', price: 11.0 },
  { name: 'Simethicone Gas Relief 80ct', price: 8.0 },
  { name: 'Lactose Intolerance Tabs 30 ct', price: 12.0 },
  { name: 'Loperamide 24 caps', price: 9.0 },
  { name: 'Bismuth Subsalicylate 16 oz', price: 12.0 },
  { name: 'Calcium + Vitamin D 120 ct', price: 12.0 },
  { name: 'Vitamin C 500mg 120 ct', price: 10.0 },
  { name: 'Vitamin D3 2000 IU 120 ct', price: 12.0 },
  { name: 'Multivitamin Adults 120 ct', price: 15.0 },
  { name: 'Probiotic 60 ct', price: 22.0 },
  { name: 'Melatonin 5mg 60 ct', price: 11.0 },
  { name: 'Fiber Supplements 100 ct', price: 14.0 },
  { name: 'Iron Supplement 60 ct', price: 10.0 },
  { name: 'Zinc 50mg 60 ct', price: 9.0 },
  { name: 'Cold & Flu Combo Pack', price: 15.0 },
  { name: 'Throat Lozenges 24 ct', price: 5.0 },
  { name: 'Eye Drops (allergy)', price: 8.0 },
  { name: 'Eye Drops (dry eye)', price: 9.0 },
  { name: 'Earwax Removal Drops', price: 7.0 },
  { name: 'Hydrocortisone Cream 1% 1 oz', price: 7.0 },
  { name: 'Antibiotic Ointment 0.5 oz', price: 8.0 },
  { name: 'Antifungal Cream 1% 0.5 oz', price: 10.0 },
  { name: 'Burn Gel 1 oz', price: 9.0 },
  { name: 'Bandage Assortment Pack', price: 5.0 },
  { name: 'Gauze Pads 25 pack', price: 6.0 },
  { name: 'Adhesive Tape 1 roll', price: 4.0 },
  { name: 'Elastic Bandage Wrap', price: 7.0 },
  { name: 'Alcohol Wipes 50 ct', price: 6.0 },
  { name: 'Hydrogen Peroxide 16 oz', price: 5.0 },
  { name: 'Digital Thermometer', price: 12.0 },
  { name: 'Hot/Cold Gel Pack', price: 8.0 },
  { name: 'Hand Sanitizer 8 oz', price: 6.0 },
  { name: 'Sunscreen SPF 30 6 oz', price: 12.0 },
  { name: 'Lip Balm SPF', price: 4.0 },
  { name: 'Insect Repellent 4 oz', price: 9.0 },
  { name: 'Hemorrhoidal Cream 1 oz', price: 10.0 },
  { name: 'Anti-itch Spray 2 oz', price: 8.0 },
  { name: 'Foot Cream 4 oz', price: 9.0 },
  { name: 'Corn & Callus Pads', price: 7.0 },
  { name: 'Sleep Aid Herbal', price: 10.0 },
  { name: 'Motion Sickness Tabs 24 ct', price: 11.0 },
  { name: 'Nicotine Gum 100 ct', price: 25.0 },
  { name: 'Quit Smoking Patches 14 ct', price: 30.0 },
  { name: 'Toothpaste Fluoride 6 oz', price: 4.0 },
  { name: 'Toothbrush Adult', price: 3.0 },
  { name: 'Dental Floss', price: 3.0 },
  { name: 'Mouthwash 16 oz', price: 6.0 },
  { name: 'Denture Adhesive 2 oz', price: 8.0 },
  { name: 'Hair Loss Shampoo 8 oz', price: 12.0 },
  { name: 'Anti-Dandruff Shampoo 8 oz', price: 10.0 },
  { name: 'Baby Pain Relief Drops', price: 8.0 },
  { name: "Children’s Cough Syrup 4 oz", price: 9.0 },
  { name: 'Kids Allergy Chewables', price: 12.0 },
  { name: 'Baby Electrolyte Solution 1 L', price: 5.0 },
  { name: 'Diaper Rash Cream 4 oz', price: 9.0 },
  { name: 'Adult Diaper Supplies', price: 15.0 },
  { name: 'Contact Solution 12 oz', price: 10.0 },
  { name: 'Reading Glasses', price: 8.0 },
  { name: 'First Aid Kit Small', price: 12.0 },
  { name: 'Cold Pack Singles', price: 3.0 },
  { name: 'Heat Pack Singles', price: 3.0 },
  { name: 'Carbon Monoxide Detector', price: 20.0 },
  { name: 'OTC Narcan Nasal Spray', price: 50.0 },
  { name: 'Nail Fungus Treatment 4 oz', price: 14.0 },
  { name: 'Wart Remover Pads', price: 11.0 },
  { name: 'Canker Sore Gel', price: 9.0 },
  { name: 'Anti-Swelling Gel', price: 10.0 },
  { name: 'Muscle Rub 3 oz', price: 8.0 },
  { name: 'Epsom Salt 4 lb', price: 6.0 },
  { name: 'Thermometer Strips', price: 5.0 },
  { name: 'Pregnancy Test', price: 10.0 },
  { name: 'Ovulation Test Kit', price: 18.0 },
  { name: 'Urinary Tract Relief Tabs', price: 12.0 },
  { name: 'Fiber Stool Softener 100 ct', price: 8.0 },
  { name: 'Pedialyte 33.8 oz', price: 5.0 },
  { name: 'Lice Treatment Kit', price: 15.0 },
  { name: 'Anti-Snoring Strips 14 ct', price: 9.0 },
  { name: 'Foot Odor Spray', price: 7.0 },
  { name: 'Cold Sore Patches 24 ct', price: 10.0 },
  { name: 'Eye Allergy Drops', price: 9.0 },
  { name: 'Artificial Tears 0.5 oz', price: 8.0 },
  { name: 'Allergy & Cold Combo Pack', price: 14.0 },
  { name: 'Antacid Powder 12 oz', price: 8.0 },
  { name: 'Digestive Enzyme 60 ct', price: 16.0 },
  { name: 'Wellness Vitamin Pack', price: 20.0 }
]

async function run() {
  const names = products.map((product) => product.name)
  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('id,name')
    .in('name', names)

  if (existingError) {
    throw existingError
  }

  const existingNames = new Set((existing || []).map((row) => row.name))
  const toInsert = products
    .filter((product) => !existingNames.has(product.name))
    .map((product) => {
      const priceCents = Math.round(product.price * 100)
      return {
        name: product.name,
        category: 'General',
        price_display: `$${product.price.toFixed(2)}`,
        price_cents: priceCents,
        in_stock: true,
        is_active: true
      }
    })

  if (toInsert.length === 0) {
    console.log('All products already exist. No inserts performed.')
    return
  }

  const { error: insertError } = await supabase.from('products').insert(toInsert)
  if (insertError) {
    throw insertError
  }

  console.log(`Inserted ${toInsert.length} products.`)
}

run().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
