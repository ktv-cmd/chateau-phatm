/**
 * One-time setup script: creates test employee accounts via Supabase admin API.
 * Run with: node tests/scripts/create-test-accounts.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Safe to re-run — skips accounts that already exist.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../.env.local')

// Parse .env.local manually (no dotenv dependency needed)
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const key = trimmed.slice(0, idx).trim()
  const value = trimmed.slice(idx + 1).trim()
  env[key] = value
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']?.replace(/\s/g, '')
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']?.replace(/\s/g, '')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const adminApi = `${SUPABASE_URL}/auth/v1/admin/users`
const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function createUser({ email, password, firstName, lastName }) {
  // Check if user already exists
  const listRes = await fetch(`${adminApi}?email=${encodeURIComponent(email)}`, { headers })
  if (listRes.ok) {
    const { users } = await listRes.json()
    if (users?.some(u => u.email === email)) {
      console.log(`  ⏭  ${email} already exists — skipping`)
      return
    }
  }

  const body = {
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  }

  const res = await fetch(adminApi, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error(`  ✗  Failed to create ${email}:`, data)
    return
  }
  console.log(`  ✓  Created ${email} (id: ${data.id})`)
}

console.log('\nCreating test employee accounts...\n')

await createUser({
  email: 'testemployee@chateau.com',
  password: 'TestEmployee123!',
  firstName: 'Test',
  lastName: 'Employee',
})

await createUser({
  email: 'testadmin@chateau.com',
  password: 'TestAdmin123!',
  firstName: 'Test',
  lastName: 'Admin',
})

console.log('\nDone. The handle_new_user trigger will auto-promote both to ADMIN role.\n')
console.log('Credentials in use:')
console.log('  Owner     : admin@chateau-demo.com / DemoAdmin123!')
console.log('  Employee  : testemployee@chateau.com / TestEmployee123!')
console.log('  Customer  : customer@chateau-demo.com / DemoUser123!\n')
