import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export async function supabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options?: any) {
        try {
            cookieStore.set(name, value, options)
        } catch {
          // Ignore cookie setting errors in server components
        }
      },
      remove(name: string, options?: any) {
        try {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        } catch {
          // Ignore cookie setting errors in server components
        }
      }
    },
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
    },
  })
}
