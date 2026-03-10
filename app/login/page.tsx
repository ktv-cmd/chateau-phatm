'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient, isSupabaseConfigured } from '@/lib/db/supabaseClient'
import { logger } from '@/lib/logger'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState(false)
  const supabaseReady = isSupabaseConfigured()

  useEffect(() => {
    if (searchParams.get('verify') === 'true') {
      setVerifyMessage(true)
    }
  }, [searchParams, supabaseReady])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!supabaseReady) {
      setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.')
      return
    }

    setIsLoading(true)

    try {
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      if (!data.user || !data.session) {
        setError('Login failed - no user or session returned. Please try again.')
        setIsLoading(false)
        return
      }

      // #region agent log
      // Check if browser client automatically set cookies
      const cookiesAfterSignIn = document.cookie.split(';').map(c => c.trim())
      const supabaseCookies = cookiesAfterSignIn.filter(c => c.startsWith('sb-'))
      fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/login/page.tsx:53',message:'Cookies after signInWithPassword',data:{allCookiesCount:cookiesAfterSignIn.length,supabaseCookiesCount:supabaseCookies.length,supabaseCookieNames:supabaseCookies.map(c=>c.split('=')[0])},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      console.log('[DEBUG] Cookies after signInWithPassword:', cookiesAfterSignIn.length, 'total,', supabaseCookies.length, 'Supabase cookies');
      // #endregion

      // Call /api/auth/set-session to sync session to server-side cookies
      // The browser client stores the session, but we need to sync it to HTTP cookies
      // that the server can read via middleware
      const sessionResponse = await fetch('/api/auth/set-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      })
      if (!sessionResponse.ok) {
        setError('Login failed - unable to set session. Please try again.')
        setIsLoading(false)
        return
      }
      
      // #region agent log
      // Check cookies after API call
      const cookiesAfterAPI = document.cookie.split(';').map(c => c.trim())
      const supabaseCookiesAfterAPI = cookiesAfterAPI.filter(c => c.startsWith('sb-'))
      fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/login/page.tsx:75',message:'Cookies after /api/auth/set-session',data:{allCookiesCount:cookiesAfterAPI.length,supabaseCookiesCount:supabaseCookiesAfterAPI.length,supabaseCookieNames:supabaseCookiesAfterAPI.map(c=>c.split('=')[0])},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      console.log('[DEBUG] Cookies after /api/auth/set-session:', cookiesAfterAPI.length, 'total,', supabaseCookiesAfterAPI.length, 'Supabase cookies');
      // #endregion
      
      // Small delay to ensure cookies are set before navigation
      await new Promise(resolve => setTimeout(resolve, 100))

      // Try to get user role; if it fails, treat as CUSTOMER and continue
      try {
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()
        if (userError) {
          logger.error('Error fetching user role:', userError)
          setIsLoading(false)
          const redirectedFrom = searchParams.get('redirectedFrom')
          window.location.href = (redirectedFrom && redirectedFrom.startsWith('/')) ? redirectedFrom : '/products'
          return
        }

        setIsLoading(false)
        
        const isAdmin = (data.user.email || '').toLowerCase() === 'admin@chateau-demo.com'
        const redirectedFrom = searchParams.get('redirectedFrom')
        const targetPath = isAdmin
          ? '/owner'
          : (redirectedFrom && redirectedFrom.startsWith('/') ? redirectedFrom : '/products')
        window.location.href = targetPath
      } catch (roleError: any) {
        logger.error('Error checking user role:', roleError)
        setIsLoading(false)
        window.location.href = '/products'
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="page flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="card max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center">Log In</h1>
          <p className="mt-2 text-center text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        <form 
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
          noValidate
        >
          {verifyMessage && (
            <div
              className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">Please check your email</p>
                  <p className="text-sm mt-1">We sent a verification link to your email. Click the link to verify your account, then return here to sign in.</p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
                className={error ? 'input-error' : 'input'}
                aria-describedby={error ? 'email-error' : undefined}
                aria-invalid={error ? 'true' : 'false'}
              />
              {error && (
                <p id="email-error" className="mt-1 text-sm text-red-600 sr-only">
                  {error}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
                  className={(error ? 'input-error' : 'input') + ' pr-20'}
                  aria-describedby={error ? 'password-error' : undefined}
                  aria-invalid={error ? 'true' : 'false'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {error && (
                <p id="password-error" className="mt-1 text-sm text-red-600 sr-only">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !supabaseReady}
              className="btn-primary w-full"
              aria-describedby={isLoading ? 'loading-text' : undefined}
              aria-disabled={isLoading || !supabaseReady}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="sr-only" id="loading-text">Loading, please wait</span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-medium text-primary-600 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
