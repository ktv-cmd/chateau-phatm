import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false
  if (supabaseUrl === 'your_supabase_url' || supabaseAnonKey === 'your_supabase_anon_key') {
    return false
  }
  return supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')
}

export const supabaseClient = isSupabaseConfigured()
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
