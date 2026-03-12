'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabaseClient, isSupabaseConfigured } from '@/lib/db/supabaseClient'
import { logger } from '@/lib/logger'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const supabaseReady = isSupabaseConfigured()

  useEffect(() => {
    document.title = 'Create Account | Chateau Drug & Homecare'
  }, [])

  // Real-time email validation
  function validateEmail(emailValue: string) {
    if (!emailValue) {
      setEmailError('')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  // Real-time password validation
  function validatePassword(passwordValue: string) {
    if (!passwordValue) {
      setPasswordError('')
      return false
    }
    if (passwordValue.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return false
    }
    setPasswordError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Clear previous errors
    setEmailError('')
    setPasswordError('')
    setConfirmPasswordError('')

    // Validate fields
    if (!email.trim()) {
      setError('Email address is required')
      setEmailError('Email address is required')
      return
    }

    if (!validateEmail(email)) {
      setError(emailError || 'Please enter a valid email address')
      return
    }

    if (!supabaseReady) {
      setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.')
      return
    }

    if (!password) {
      setError('Password is required')
      setPasswordError('Password is required')
      return
    }

    if (!validatePassword(password)) {
      setError(passwordError || 'Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setConfirmPasswordError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/products`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Ensure user record exists in public.users
        // The trigger should create it, but we'll ensure it exists via API route if user is logged in
        // If no session (email confirmation required), the trigger should handle it when email is confirmed
        if (data.session) {
          // User is logged in - use API route to ensure user record exists
          try {
            const response = await fetch('/api/users/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}))
                  logger.error('Failed to ensure user record exists:', errorData)
              // Try direct insert as fallback (will work if INSERT policy exists)
              try {
                const { error: insertError } = await supabaseClient.from('users').insert({
                    id: data.user.id,
                  email: data.user.email || email
                  })

                if (insertError && !insertError.message.includes('duplicate')) {
                  logger.error('Direct insert also failed:', insertError)
                }
              } catch (insertErr) {
                logger.error('Error with direct insert:', insertErr)
              }
            }
          } catch (err) {
            logger.error('Error ensuring user record:', err)
            // Don't fail signup - trigger should handle it
          }
        }

        setSuccess(true)
        setError('')
        setNeedsVerification(!data.session)
        setIsLoading(false)

        // Only auto-redirect when email verification is NOT required.
        // If verification is needed, user must act on the email — don't redirect.
        if (data.session) {
          setTimeout(() => {
            window.location.href = '/products?welcome=true'
          }, 2500)
        }
      } else {
        setError('Account creation failed. Please try again.')
        setIsLoading(false)
      }
    } catch (err: any) {
      logger.error('Signup error:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="page flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="card max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center">Create Account</h1>
          <p className="mt-2 text-center text-gray-600">
            Create an account to start ordering
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {success && !error && (
            <div
              className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">Account created successfully!</p>
                  <p className="text-sm mt-1">
                    {needsVerification
                      ? 'Please check your email to verify your account. Once verified, you can sign in.'
                      : 'Your account is ready.'}
                  </p>
                  {!needsVerification && (
                    <a
                      href="/products?welcome=true"
                      className="mt-2 inline-block text-sm font-medium text-green-800 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-green-600 rounded"
                    >
                      Continue to shop →
                    </a>
                  )}
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  validateEmail(e.target.value)
                }}
                onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
                onBlur={(e) => validateEmail(e.target.value)}
                className={emailError ? 'input-error' : 'input'}
                aria-describedby={emailError ? 'email-error' : undefined}
                aria-invalid={emailError ? 'true' : 'false'}
                placeholder="your.email@example.com"
              />
              {emailError && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {emailError}
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
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    validatePassword(e.target.value)
                  }}
                  onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
                  onBlur={(e) => validatePassword(e.target.value)}
                className={passwordError ? 'input-error pr-20' : 'input pr-20'}
                aria-describedby={passwordError ? 'password-error' : undefined}
                aria-invalid={passwordError ? 'true' : 'false'}
                  placeholder="Enter your password"
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
              {passwordError && (
                <p id="password-error" className="mt-1 text-sm text-red-600">
                  {passwordError}
                </p>
              )}
              {!passwordError && password && password.length >= 8 && (
                <p className="mt-1 text-sm text-green-600" role="status" aria-live="polite">
                  Password strength: good
                </p>
              )}
              {!passwordError && !password && (
                <p className="mt-1 text-sm text-gray-600">
                  Must be at least 8 characters
                </p>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onInput={(e) => setConfirmPassword((e.currentTarget as HTMLInputElement).value)}
                  className={(confirmPasswordError ? 'input-error' : 'input') + ' pr-20'}
                  aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
                  aria-invalid={confirmPasswordError ? 'true' : 'false'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-pressed={showConfirmPassword}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {confirmPasswordError && (
                <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {confirmPasswordError}
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
            >
              {isLoading ? (
                <>
                  <span className="sr-only" id="loading-text">Loading, please wait</span>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-primary-600 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              >
                Log in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
