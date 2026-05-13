'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OrderStatusHistory } from '@/lib/types'

export default function AuditPage() {
  const router = useRouter()
  const [history, setHistory] = useState<OrderStatusHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const res = await fetch('/api/owner/audit')
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || 'Failed to load audit log.')
      setIsLoading(false)
      return
    }
    const data = await res.json()
    setHistory(data.history || [])
    setIsLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter.trim()
    ? history.filter((h) =>
        h.updated_by_name.toLowerCase().includes(filter.toLowerCase()) ||
        h.updated_by_email.toLowerCase().includes(filter.toLowerCase()) ||
        h.order_id.includes(filter)
      )
    : history

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary-700 mb-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-gray-500 mt-1 text-sm">Full history of all order status changes across all employees.</p>
        </div>

        <div className="mb-4">
          <input
            type="search"
            placeholder="Filter by employee name, email, or order ID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input max-w-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="card text-center py-12 text-gray-500">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            {filter ? 'No results match your filter.' : 'No status changes recorded yet.'}
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full" aria-label="Audit log">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th scope="col" className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                  <th scope="col" className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order</th>
                  <th scope="col" className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Change</th>
                  <th scope="col" className="text-left py-3 px-4 text-sm font-semibold text-gray-700">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 text-sm">{entry.updated_by_name}</div>
                      <div className="text-xs text-gray-500">{entry.updated_by_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`/owner/orders/${entry.order_id}`}
                        className="text-sm text-primary-700 hover:underline font-medium"
                      >
                        #{entry.order_id.slice(0, 8)}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {entry.old_status
                        ? <>{entry.old_status} → <span className="font-medium">{entry.new_status}</span></>
                        : <>Set to <span className="font-medium">{entry.new_status}</span></>
                      }
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(entry.updated_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length >= 200 && (
              <p className="text-xs text-gray-400 text-center py-3 border-t">Showing most recent 200 entries.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
