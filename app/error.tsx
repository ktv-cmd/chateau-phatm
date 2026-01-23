'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Something went wrong!</h1>
        <p className="text-gray-600 mb-8">
          We encountered an unexpected error. Please try again.
        </p>
        {error.message && (
          <details className="mb-8 p-4 bg-red-50 border border-red-200 rounded text-left">
            <summary className="cursor-pointer font-medium text-red-800 mb-2">
              Error Details
            </summary>
            <p className="text-sm text-red-700 font-mono">{error.message}</p>
          </details>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="btn-primary"
            aria-label="Try again"
          >
            Try again
          </button>
          <Link
            href="/"
            className="btn-secondary"
            aria-label="Go to home page"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
