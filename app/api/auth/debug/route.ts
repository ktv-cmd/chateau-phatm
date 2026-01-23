import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export async function GET(request: NextRequest) {
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // no-op for debug
      },
    },
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
    },
  })

  const { data: authData, error } = await supabase.auth.getUser()
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name)

  return NextResponse.json({
    hasUser: !!authData?.user,
    authError: error?.message || null,
    cookieNames,
  })
}
