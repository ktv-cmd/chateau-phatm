import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { config } from './config'

const supabaseUrl = config.supabase.url
const supabaseAnonKey = config.supabase.anonKey


// Only create client if we have valid URLs (not placeholders)
const isValidUrl = supabaseUrl && 
  supabaseUrl !== 'your_supabase_url' && 
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))

// Use createBrowserClient from @supabase/ssr to sync cookies with server
// This ensures sessions persist in cookies and are visible to both client and server
export const supabase = isValidUrl && supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createBrowserClient('https://placeholder.supabase.co', 'placeholder-key') // Dummy client that won't be used

// Server-side client with service role key (for privileged operations)
export function createServerClient() {
  const serviceRoleKey = config.supabase.serviceRoleKey
  if (!serviceRoleKey || serviceRoleKey === 'your_service_role_key') {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
