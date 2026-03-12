'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/db/supabaseClient'

type Status = 'verifying' | 'ready' | 'success' | 'invalid'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      // Explicitly exchange the code — avoids race condition with auto-detection
      supabaseClient.auth.exchangeCodeForSession(code).then(({ error }) => {
        setStatus(error ? 'invalid' : 'ready')
      })
      return
    }

    // No code in URL — check for an existing session (e.g. page refresh after exchange)
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? 'ready' : 'invalid')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    const { error: updateError } = await supabaseClient.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
    } else {
      await supabaseClient.auth.signOut()
      setStatus('success')
    }
  }

  return (
    <div className="page py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="card max-w-md w-full space-y-6 p-8">

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">Chateau Drug &amp; Homecare</p>
        </div>

        {status === 'verifying' && (
          <div className="text-center py-6">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" aria-hidden="true" />
            <p className="mt-3 text-sm text-gray-500">Verifying your reset link…</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-4" role="alert">
              <p className="font-medium text-red-800 text-sm">Link expired or already used</p>
              <p className="mt-1 text-sm text-red-700">
                Password reset links expire after 1 hour and can only be used once.
                Please request a new one from the login page.
              </p>
            </div>
            <Link href="/login" className="btn-primary w-full text-center block">
              Back to Log In
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-gray-600">Enter a new password for your account.</p>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="label">New Password</label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-20"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="label">Confirm New Password</label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4" role="alert">
              <p className="font-medium text-green-800 text-sm">Password updated!</p>
              <p className="mt-1 text-sm text-green-700">
                Your password has been changed. You can now log in with your new password.
              </p>
            </div>
            <Link href="/login" className="btn-primary w-full text-center block">
              Go to Log In
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
