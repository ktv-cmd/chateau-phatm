'use client'

import { useEffect, useState } from 'react'
import { SearchSafetyWarning } from '@/lib/search/types'

interface SafetyBannerProps {
  warnings: SearchSafetyWarning[]
  storageKey?: string
}

export function SafetyBanner({ warnings, storageKey = 'search-safety-dismissed' }: SafetyBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.sessionStorage.getItem(storageKey)
    setDismissed(stored === 'true')
  }, [storageKey])

  if (!warnings.length || dismissed) {
    return null
  }

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">Safety notice</p>
          <ul className="mt-1 space-y-1 text-sm">
            {warnings.map((warning) => (
              <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="text-sm font-medium underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-amber-600 rounded"
          aria-label="Dismiss safety notice"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(storageKey, 'true')
            }
            setDismissed(true)
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
