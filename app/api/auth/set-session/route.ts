import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import { writeFile, appendFile } from 'fs/promises'
import { join } from 'path'

async function logDebug(location: string, message: string, data: any) {
  const logEntry = JSON.stringify({location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'}) + '\n';
  try {
    await appendFile(join(process.cwd(), '.cursor', 'debug.log'), logEntry);
  } catch {}
}

export async function POST(request: NextRequest) {
  // #region agent log
  console.log('[DEBUG] ===== set-session POST called =====');
  const initialCookies = request.cookies.getAll();
  console.log('[DEBUG] Initial cookies:', initialCookies.length, initialCookies.map(c => c.name));
  await logDebug('app/api/auth/set-session/route.ts:14', 'set-session POST called', {
    hasAccessToken:!!request.body,
    initialCookieCount: initialCookies.length,
    initialCookieNames: initialCookies.map(c => c.name)
  });
  // #endregion
  try {
    const { access_token, refresh_token } = await request.json()
    // #region agent log
    await logDebug('app/api/auth/set-session/route.ts:11', 'Tokens received', {hasAccessToken:!!access_token,hasRefreshToken:!!refresh_token,accessTokenLen:access_token?.length||0,refreshTokenLen:refresh_token?.length||0});
    // #endregion

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Access token and refresh token are required' },
        { status: 400 }
      )
    }

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    let response = NextResponse.json({ success: true })
    response.headers.set('Cache-Control', 'no-store')

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          response.cookies.set(name, value, options)
        },
        remove(name: string, options?: any) {
          response.cookies.set(name, '', { ...options, maxAge: 0 })
        }
      },
      cookieOptions: {
            secure: process.env.NODE_ENV === 'production',
      },
    })

    // Set the session on the server, which will set the cookies
    console.log('[DEBUG] About to call setSession');
    console.log('[DEBUG] Access token length:', access_token?.length || 0);
    console.log('[DEBUG] Refresh token length:', refresh_token?.length || 0);
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })
    // #region agent log
    console.log('[DEBUG] setSession result:', { hasError: !!error, errorMessage: error?.message, hasData: !!data, hasUser: !!data?.user, hasSession: !!data?.session });
    await logDebug('app/api/auth/set-session/route.ts:90', 'setSession result', {hasError:!!error,errorMessage:error?.message||null,hasData:!!data,hasUser:!!data?.user,hasSession:!!data?.session,userId:data?.user?.id||null});
    // #endregion

    if (error) {
      return NextResponse.json(
        { error: 'Failed to set session', details: error.message },
        { status: 500 }
      )
    }

    // Call getUser() to verify session is now readable server-side
    console.log('[DEBUG] About to call getUser() to trigger setAll');
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('[DEBUG] getUser() result:', { hasError: !!userError, hasUser: !!userData?.user });
    // #region agent log
    await logDebug('app/api/auth/set-session/route.ts:125', 'getUser called after setSession', {hasError:!!userError,hasUser:!!userData?.user});
    // #endregion

    return response
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to set session', details: err.message },
      { status: 500 }
    )
  }
}
