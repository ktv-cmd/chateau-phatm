import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(envPath) {
  const content = fs.readFileSync(envPath, 'utf8')
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

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

const envPath = path.join(process.cwd(), '.env.local')
try {
  loadEnvFile(envPath)
} catch (e) {
  console.error(`Could not read ${envPath}:`, e?.message ?? e)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('SUPABASE_URL set:', Boolean(url))
console.log('SUPABASE_ANON_KEY set:', Boolean(anonKey))

if (!url || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

const email = `test+${Date.now()}@example.com`
const password = 'Test1234!'

console.log('Creating user:', email)
const signup = await supabase.auth.signUp({ email, password })

if (signup.error) {
  console.error('SIGNUP ERROR:', signup.error.message)
  process.exit(2)
}

console.log('Signup ok. userId:', signup.data.user?.id ?? null, 'session:', Boolean(signup.data.session))

const signin = await supabase.auth.signInWithPassword({ email, password })
if (signin.error) {
  console.error('SIGNIN ERROR:', signin.error.message)
  console.log('(This is expected if email confirmation is required.)')
  process.exit(0)
}

console.log('Signin ok. userId:', signin.data.user?.id ?? null)

