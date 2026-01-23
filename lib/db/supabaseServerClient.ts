import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export async function supabaseServerClient() {
  const cookieStore = await cookies()
  // #region agent log
  const allCookies = cookieStore.getAll();
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/db/supabaseServerClient.ts:7',message:'supabaseServerClient created',data:{cookieCount:allCookies.length,cookieNames:allCookies.map(c=>c.name)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

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
