import fs from 'node:fs'
import path from 'node:path'

function loadEnvFromFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/seed.ts:12',message:'Loading env file',data:{filePath,exists:true,size:content.length},timestamp:Date.now(),sessionId:'debug-session',runId:'seed-pre',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq < 0) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    // For seeding, prefer values from `.env.local` (override any inherited placeholders)
    process.env[key] = value
  }
}

const products = [
  { name: 'Acetaminophen 500mg Caplets', category: 'Pain Relief', description: 'Fast-acting pain relief and fever reducer', price: '7.99' },
  { name: 'Ibuprofen 200mg Tablets', category: 'Pain Relief', description: 'Anti-inflammatory pain relief', price: '8.99' },
  { name: 'Naproxen Sodium 220mg', category: 'Pain Relief', description: 'Extended relief for minor aches and pains', price: '9.99' },
  { name: 'Aspirin 81mg Low Dose', category: 'Pain Relief', description: 'Daily low-dose aspirin for heart health', price: '6.99' },
  { name: 'Excedrin Migraine', category: 'Pain Relief', description: 'Migraine pain relief formula', price: '12.99' },
  { name: 'Topical Pain Relief Gel (Menthol)', category: 'Pain Relief', description: 'Cooling gel for muscle and joint pain', price: '11.99' },
  { name: 'Lidocaine Pain Relief Patch', category: 'Pain Relief', description: 'Numbing patch for localized pain relief', price: '14.99' },
  { name: 'Muscle Rub Cream', category: 'Pain Relief', description: 'Soothing cream for sore muscles', price: '10.99' },
  { name: 'Heat Therapy Patches', category: 'Pain Relief', description: 'Self-heating patches for muscle pain', price: '13.99' },
  { name: 'Digital Thermometer', category: 'Home Medical', description: 'Fast and accurate digital thermometer', price: '12.99' },
  { name: 'Cold & Flu Multi-Symptom Daytime', category: 'Cold & Flu', description: 'Daytime relief for cold and flu symptoms', price: '11.99' },
  { name: 'Cold & Flu Nighttime Relief', category: 'Cold & Flu', description: 'Nighttime formula for restful sleep', price: '11.99' },
  { name: 'Cough Suppressant Syrup (Dextromethorphan)', category: 'Cold & Flu', description: 'Controls cough for up to 8 hours', price: '9.99' },
  { name: 'Expectorant (Guaifenesin)', category: 'Cold & Flu', description: 'Helps loosen phlegm and mucus', price: '9.99' },
  { name: 'Sore Throat Lozenges (Honey Lemon)', category: 'Cold & Flu', description: 'Soothing lozenges for sore throat', price: '6.99' },
  { name: 'Nasal Decongestant Tablets', category: 'Cold & Flu', description: 'Relieves nasal congestion', price: '8.99' },
  { name: 'Saline Nasal Spray', category: 'Cold & Flu', description: 'Gentle saline solution for nasal irrigation', price: '7.99' },
  { name: 'Vapor Rub Ointment', category: 'Cold & Flu', description: 'Topical ointment for chest and throat', price: '8.99' },
  { name: 'Immune Support Packets (Vitamin C)', category: 'Vitamins & Supplements', description: 'High-dose vitamin C for immune support', price: '14.99' },
  { name: 'COVID-19 Antigen Test Kit', category: 'Home Medical', description: 'At-home COVID-19 rapid test', price: '19.99' },
  { name: 'Allergy Relief 24 Hour (Loratadine)', category: 'Allergy', description: 'Non-drowsy 24-hour allergy relief', price: '15.99' },
  { name: 'Allergy Relief 24 Hour (Cetirizine)', category: 'Allergy', description: 'Fast-acting 24-hour allergy relief', price: '15.99' },
  { name: 'Allergy Relief 24 Hour (Fexofenadine)', category: 'Allergy', description: 'Prescription-strength allergy relief', price: '16.99' },
  { name: 'Diphenhydramine 25mg', category: 'Allergy', description: 'Antihistamine for allergies and sleep aid', price: '7.99' },
  { name: 'Allergy Eye Drops', category: 'Eye Care', description: 'Relief for itchy, watery eyes', price: '12.99' },
  { name: 'Anti-Itch Cream (Hydrocortisone 1%)', category: 'Skin Care', description: 'Topical cream for itching and irritation', price: '8.99' },
  { name: 'Nasal Allergy Spray', category: 'Allergy', description: 'Prescription-strength nasal spray', price: '18.99' },
  { name: 'Disposable Face Masks (Box)', category: 'Respiratory', description: 'Box of 50 disposable face masks', price: '12.99' },
  { name: 'Sinus Rinse Kit', category: 'Cold & Flu', description: 'Complete nasal irrigation system', price: '16.99' },
  { name: 'Epinephrine Auto-Injector Case (Accessory)', category: 'Allergy', description: 'Protective case for auto-injector', price: '9.99' },
  { name: 'Antacid Chewable Tablets', category: 'Digestive', description: 'Fast relief for heartburn and indigestion', price: '6.99' },
  { name: 'Omeprazole 20mg', category: 'Digestive', description: 'Acid reducer for frequent heartburn', price: '14.99' },
  { name: 'Famotidine 20mg', category: 'Digestive', description: 'H2 blocker for acid reduction', price: '12.99' },
  { name: 'Anti-Diarrheal (Loperamide)', category: 'Digestive', description: 'Controls diarrhea symptoms', price: '8.99' },
  { name: 'Stool Softener (Docusate)', category: 'Digestive', description: 'Gentle relief for constipation', price: '7.99' },
  { name: 'Fiber Supplement Powder', category: 'Digestive', description: 'Soluble fiber for digestive health', price: '13.99' },
  { name: 'Probiotic Capsules', category: 'Vitamins & Supplements', description: 'Beneficial bacteria for gut health', price: '19.99' },
  { name: 'Motion Sickness Tablets', category: 'Digestive', description: 'Prevents and treats motion sickness', price: '9.99' },
  { name: 'Nausea Relief Liquid', category: 'Digestive', description: 'Fast-acting liquid for nausea', price: '8.99' },
  { name: 'Gas Relief Softgels', category: 'Digestive', description: 'Relieves gas and bloating', price: '7.99' },
  { name: 'Adult Multivitamin', category: 'Vitamins & Supplements', description: 'Complete daily multivitamin', price: '16.99' },
  { name: 'Multivitamin Gummies', category: 'Vitamins & Supplements', description: 'Delicious gummy multivitamin', price: '14.99' },
  { name: 'Vitamin C 1000mg', category: 'Vitamins & Supplements', description: 'High-potency vitamin C supplement', price: '11.99' },
  { name: 'Vitamin D3 2000 IU', category: 'Vitamins & Supplements', description: 'Essential vitamin D for bone health', price: '12.99' },
  { name: 'Zinc Tablets', category: 'Vitamins & Supplements', description: 'Immune support with zinc', price: '9.99' },
  { name: 'Magnesium Supplement', category: 'Vitamins & Supplements', description: 'Supports muscle and nerve function', price: '13.99' },
  { name: 'Omega-3 Fish Oil', category: 'Vitamins & Supplements', description: 'Heart and brain health support', price: '18.99' },
  { name: 'B-Complex Vitamins', category: 'Vitamins & Supplements', description: 'Complete B vitamin complex', price: '15.99' },
  { name: 'Iron Supplement', category: 'Vitamins & Supplements', description: 'Iron for healthy red blood cells', price: '10.99' },
  { name: 'Electrolyte Drink Mix', category: 'Vitamins & Supplements', description: 'Replenishes electrolytes and hydration', price: '8.99' },
  { name: 'Adhesive Bandages Assorted', category: 'First Aid', description: 'Assorted sizes of adhesive bandages', price: '5.99' },
  { name: 'Sterile Gauze Pads', category: 'First Aid', description: 'Sterile gauze for wound care', price: '7.99' },
  { name: 'Medical Tape', category: 'First Aid', description: 'Hypoallergenic medical tape', price: '6.99' },
  { name: 'Antiseptic Wipes', category: 'First Aid', description: 'Convenient antiseptic cleaning wipes', price: '8.99' },
  { name: 'Hydrogen Peroxide 3%', category: 'First Aid', description: 'Antiseptic solution for wound cleaning', price: '4.99' },
  { name: 'Isopropyl Alcohol 70%', category: 'First Aid', description: 'Disinfectant and antiseptic', price: '5.99' },
  { name: 'Antibiotic Ointment', category: 'First Aid', description: 'Prevents infection in minor cuts', price: '7.99' },
  { name: 'Burn Gel', category: 'First Aid', description: 'Cooling gel for minor burns', price: '9.99' },
  { name: 'Instant Cold Pack', category: 'First Aid', description: 'Single-use instant cold pack', price: '6.99' },
  { name: 'Elastic Bandage Wrap', category: 'First Aid', description: 'Elastic wrap for sprains and support', price: '8.99' },
  { name: 'Gentle Facial Cleanser', category: 'Skin Care', description: 'Gentle cleanser for sensitive skin', price: '11.99' },
  { name: 'Moisturizing Lotion', category: 'Skin Care', description: 'Daily moisturizer for all skin types', price: '10.99' },
  { name: 'Sunscreen SPF 50', category: 'Skin Care', description: 'Broad spectrum sun protection', price: '13.99' },
  { name: 'Acne Treatment Gel (Benzoyl Peroxide)', category: 'Skin Care', description: 'Topical treatment for acne', price: '12.99' },
  { name: 'Lip Balm', category: 'Skin Care', description: 'Moisturizing lip balm with SPF', price: '4.99' },
  { name: 'Hand Sanitizer', category: 'First Aid', description: 'Alcohol-based hand sanitizer', price: '5.99' },
  { name: 'Antifungal Cream (Clotrimazole)', category: 'Skin Care', description: 'Treats athlete\'s foot and ringworm', price: '9.99' },
  { name: 'Eczema Relief Cream', category: 'Skin Care', description: 'Soothes dry, irritated skin', price: '14.99' },
  { name: 'Dandruff Shampoo', category: 'Skin Care', description: 'Medicated shampoo for dandruff', price: '11.99' },
  { name: 'Body Wash (Sensitive Skin)', category: 'Skin Care', description: 'Gentle body wash for sensitive skin', price: '9.99' },
  { name: 'Fluoride Toothpaste', category: 'Oral Care', description: 'Cavity-fighting fluoride toothpaste', price: '5.99' },
  { name: 'Soft Toothbrush', category: 'Oral Care', description: 'Soft-bristled manual toothbrush', price: '4.99' },
  { name: 'Dental Floss', category: 'Oral Care', description: 'Waxed dental floss', price: '3.99' },
  { name: 'Antiseptic Mouthwash', category: 'Oral Care', description: 'Kills germs and freshens breath', price: '6.99' },
  { name: 'Whitening Strips', category: 'Oral Care', description: 'At-home teeth whitening strips', price: '24.99' },
  { name: 'Denture Adhesive', category: 'Oral Care', description: 'Secure hold for dentures', price: '7.99' },
  { name: 'Kids Toothpaste', category: 'Oral Care', description: 'Fluoride toothpaste for children', price: '4.99' },
  { name: 'Kids Toothbrush', category: 'Oral Care', description: 'Fun toothbrush for kids', price: '3.99' },
  { name: 'Tongue Cleaner', category: 'Oral Care', description: 'Removes bacteria from tongue', price: '5.99' },
  { name: 'Travel Oral Care Kit', category: 'Oral Care', description: 'Complete travel-sized oral care set', price: '8.99' },
  { name: 'Artificial Tears Eye Drops', category: 'Eye Care', description: 'Lubricating eye drops for dry eyes', price: '10.99' },
  { name: 'Allergy Relief Eye Drops', category: 'Eye Care', description: 'Relieves itchy, red eyes from allergies', price: '12.99' },
  { name: 'Contact Lens Solution', category: 'Eye Care', description: 'Multi-purpose contact lens solution', price: '9.99' },
  { name: 'Eye Wash', category: 'Eye Care', description: 'Sterile eye wash solution', price: '8.99' },
  { name: 'Reading Glasses +1.50', category: 'Eye Care', description: 'Reading glasses magnification +1.50', price: '15.99' },
  { name: 'Reading Glasses +2.00', category: 'Eye Care', description: 'Reading glasses magnification +2.00', price: '15.99' },
  { name: 'Lens Cleaning Wipes', category: 'Eye Care', description: 'Pre-moistened lens cleaning wipes', price: '7.99' },
  { name: 'Warm Eye Compress Mask', category: 'Eye Care', description: 'Reusable warm compress for eye relief', price: '12.99' },
  { name: 'Nighttime Eye Ointment', category: 'Eye Care', description: 'Lubricating ointment for overnight use', price: '11.99' },
  { name: 'Blue Light Screen Glasses', category: 'Eye Care', description: 'Reduces digital eye strain', price: '19.99' },
  { name: 'Baby Diapers Size 3', category: 'Baby Care', description: 'Absorbent diapers for babies', price: 'Call' },
  { name: 'Baby Wipes (Sensitive)', category: 'Baby Care', description: 'Gentle wipes for sensitive baby skin', price: '6.99' },
  { name: 'Diaper Rash Cream', category: 'Baby Care', description: 'Soothes and prevents diaper rash', price: '8.99' },
  { name: 'Infant Gas Drops', category: 'Baby Care', description: 'Relieves gas and discomfort in infants', price: '9.99' },
  { name: 'Infant Acetaminophen', category: 'Baby Care', description: 'Pain and fever relief for infants', price: '10.99' },
  { name: 'Feminine Pads (Regular)', category: 'Feminine Care', description: 'Regular absorbency feminine pads', price: '7.99' },
  { name: 'Tampons (Regular)', category: 'Feminine Care', description: 'Regular absorbency tampons', price: '7.99' },
  { name: 'Pregnancy Test', category: 'Feminine Care', description: 'Early detection pregnancy test', price: '12.99' },
  { name: 'Blood Glucose Test Strips', category: 'Diabetes Care', description: 'Test strips for blood glucose monitoring', price: 'Call' },
  { name: 'Fingertip Pulse Oximeter', category: 'Home Medical', description: 'Measures blood oxygen saturation', price: '29.99' },
]

async function seed() {
  // Ensure `.env.local` is loaded for `tsx scripts/seed.ts`
  const envPath = path.join(process.cwd(), '.env.local')
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/seed.ts:48',message:'Seed starting',data:{cwd:process.cwd(),envPath},timestamp:Date.now(),sessionId:'debug-session',runId:'seed-pre',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  loadEnvFromFile(envPath)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/seed.ts:58',message:'Env after load (.env.local)',data:{url, urlStartsHttps:url.startsWith('https://'), anonStartsEyJ:anon.startsWith('eyJ'), anonLen:anon.length, serviceStartsEyJ:service.startsWith('eyJ'), serviceLen:service.length},timestamp:Date.now(),sessionId:'debug-session',runId:'seed-pre',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  // Import after env is loaded because env validation runs on import
  const { supabaseServiceClient } = await import('../lib/db/supabaseServiceClient')
  const supabase = supabaseServiceClient()

  console.log('Starting seed...')

  // Seed products
  console.log('Seeding products...')
  for (const product of products) {
    // First check if product exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', product.name)
      .single()

    if (existing) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update({
          category: product.category,
          description: product.description,
          price_display: product.price,
          in_stock: true
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`Error updating product ${product.name}:`, error)
      }
    } else {
      // Insert new product
      const { error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          category: product.category,
          description: product.description,
          price_display: product.price,
          in_stock: true
        })

      if (error) {
        console.error(`Error seeding product ${product.name}:`, error)
      }
    }
  }
  console.log(`Seeded ${products.length} products`)

  // Create demo users
  console.log('Creating demo users...')

  // Owner user
  const { data: ownerAuth, error: ownerAuthError } = await supabase.auth.admin.createUser({
    email: 'admin@chateau-demo.com',
    password: 'DemoAdmin123!',
    email_confirm: true
  })

  if (ownerAuthError && !ownerAuthError.message.includes('already registered')) {
    console.error('Error creating owner user:', ownerAuthError)
  } else if (ownerAuth?.user) {
    await supabase
      .from('users')
      .update({ role: 'ADMIN' })
      .eq('id', ownerAuth.user.id)
    console.log('Created owner user: admin@chateau-demo.com / DemoAdmin123!')
  }
  // Ensure primary role is set even if the user already existed
  await supabase
    .from('users')
    .update({ role: 'ADMIN' })
    .eq('email', 'admin@chateau-demo.com')

  // Customer user
  const { data: customerAuth, error: customerAuthError } = await supabase.auth.admin.createUser({
    email: 'customer@chateau-demo.com',
    password: 'DemoUser123!',
    email_confirm: true
  })

  if (customerAuthError && !customerAuthError.message.includes('already registered')) {
    console.error('Error creating customer user:', customerAuthError)
  } else if (customerAuth?.user) {
    console.log('Created customer user: customer@chateau-demo.com / DemoUser123!')
  }

  console.log('Seed complete!')
}

seed().catch(console.error)
