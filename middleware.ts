import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/roles'

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

  // Refresh session cookie if needed
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection: /owner requires authentication
  if (request.nextUrl.pathname.startsWith('/owner')) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect logged-in users away from /login based on role
  if (request.nextUrl.pathname === '/login' && user) {
    if (isAdmin(user.email)) {
      return NextResponse.redirect(new URL('/owner', request.url))
    } else {
      const redirectTo = request.nextUrl.searchParams.get('redirectedFrom')
      const destination = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/owner') ? redirectTo : '/products'
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

