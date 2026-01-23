import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase isn't configured, just continue.
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url' || supabaseAnonKey === 'your_supabase_anon_key') {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  // Debug: Log ALL cookies BEFORE getUser (to see what browser sent)
  const cookiesBefore = request.cookies.getAll()
  const cookieNamesBefore = cookiesBefore.map(c => c.name)
  const cookieValuesBefore = cookiesBefore.map(c => ({ 
    name: c.name, 
    hasValue: !!c.value, 
    valueLen: c.value?.length || 0,
    valueStart: c.value?.substring(0, 50) || '',
    isURLEncoded: c.value ? (c.value.includes('%') || decodeURIComponent(c.value) !== c.value) : false
  }))
  if (request.nextUrl.pathname.startsWith('/owner') || request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api/auth/set-session')) {
    fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:42',message:'Cookies BEFORE getUser',data:{pathname:request.nextUrl.pathname,cookieCount:cookiesBefore.length,cookieNames:cookieNamesBefore,cookieValues:cookieValuesBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
    console.log(`[MIDDLEWARE] ${request.nextUrl.pathname} - BEFORE getUser: cookies: ${cookiesBefore.length} (${cookieNamesBefore.join(', ') || 'none'})`);
    // Try to parse cookie value to see if it's valid JSON
    const supabaseCookie = cookiesBefore.find(c => c.name.startsWith('sb-'))
    if (supabaseCookie) {
      try {
        const parsed = JSON.parse(supabaseCookie.value)
        console.log(`[MIDDLEWARE] Cookie value is valid JSON, keys:`, Object.keys(parsed))
        fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:55',message:'Cookie value parsed',data:{isValidJSON:true,keys:Object.keys(parsed),hasAccessToken:!!parsed.access_token,hasRefreshToken:!!parsed.refresh_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        console.log(`[MIDDLEWARE] Cookie value is NOT valid JSON: ${errorMessage}`)
        fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:60',message:'Cookie value parse failed',data:{error:errorMessage,valueStart:supabaseCookie.value.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
      }
    }
  }

  // Refresh session cookie if needed - this triggers setAll if cookies need updating
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Debug: Log cookie count and auth state AFTER getUser
  const cookiesAfter = request.cookies.getAll()
  const cookieNamesAfter = cookiesAfter.map(c => c.name)
  if (request.nextUrl.pathname.startsWith('/owner') || request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api/auth/set-session')) {
    fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:50',message:'Cookies AFTER getUser',data:{pathname:request.nextUrl.pathname,cookieCount:cookiesAfter.length,cookieNames:cookieNamesAfter,hasUser:!!user,userId:user?.id||null,error:authError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    console.log(`[MIDDLEWARE] ${request.nextUrl.pathname} - AFTER getUser: cookies: ${cookiesAfter.length} (${cookieNamesAfter.join(', ') || 'none'}), user: ${user ? user.id : 'null'}, error: ${authError?.message || 'none'}`)
  }

  // Route protection: /owner requires authentication
  if (request.nextUrl.pathname.startsWith('/owner')) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect logged-in users away from /login
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/owner', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

