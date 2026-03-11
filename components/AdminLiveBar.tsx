'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const POLL_INTERVAL_MS = 60_000 // 1 minute

interface PollData {
  latestOrderId: string | null
  latestOrderAt: string | null
  newOrderCount: number
  latestRefillId: string | null
  latestRefillAt: string | null
  newRefillCount: number
}

interface Notification {
  id: number
  type: 'order' | 'refill'
  message: string
  href: string
}

export function AdminLiveBar() {
  const router = useRouter()
  const baselineRef = useRef<PollData | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const notifCounter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/poll', { cache: 'no-store' })
      if (!res.ok) return
      const data: PollData = await res.json()

      // First call — just store baseline, no notifications
      if (!baselineRef.current) {
        baselineRef.current = data
        setLastRefreshed(new Date())
        return
      }

      const prev = baselineRef.current
      const newNotifs: Notification[] = []

      // New order arrived if latestOrderId changed
      if (data.latestOrderId && data.latestOrderId !== prev.latestOrderId) {
        newNotifs.push({
          id: ++notifCounter.current,
          type: 'order',
          message: `${data.newOrderCount} new order${data.newOrderCount !== 1 ? 's' : ''} waiting`,
          href: '/owner/orders',
        })
      }

      // New refill arrived if latestRefillId changed
      if (data.latestRefillId && data.latestRefillId !== prev.latestRefillId) {
        newNotifs.push({
          id: ++notifCounter.current,
          type: 'refill',
          message: `${data.newRefillCount} new refill request${data.newRefillCount !== 1 ? 's' : ''} waiting`,
          href: '/owner/refills',
        })
      }

      if (newNotifs.length > 0) {
        setNotifications((prev) => [...newNotifs, ...prev])
        router.refresh()
      }

      baselineRef.current = data
      setLastRefreshed(new Date())
    } catch {
      // Network error — silently skip, will retry next interval
    }
  }, [router])

  useEffect(() => {
    poll() // immediate first poll
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [poll])

  if (notifications.length === 0) {
    return (
      <div className="print:hidden flex justify-end px-4 pt-1 pb-0">
        {lastRefreshed && (
          <span className="text-xs text-gray-400">
            Auto-refresh active · last checked {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="print:hidden flex flex-col gap-2 px-4 pt-3">
      {notifications.map((n) => (
        <div
          key={n.id}
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-md ${
            n.type === 'order'
              ? 'bg-yellow-50 border border-yellow-300 text-yellow-900'
              : 'bg-purple-50 border border-purple-300 text-purple-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {n.type === 'order' ? (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10l8 4 8-4V7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4 6h16M4 10h4M4 14h4M4 18h4" />
              </svg>
            )}
            <span>{n.message}</span>
            <Link
              href={n.href}
              className={`ml-1 underline underline-offset-2 hover:opacity-80 ${
                n.type === 'order' ? 'text-yellow-800' : 'text-purple-800'
              }`}
            >
              View →
            </Link>
          </div>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md p-1 hover:bg-black/10 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
