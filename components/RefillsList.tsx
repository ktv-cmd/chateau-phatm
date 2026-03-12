'use client'

import { useState } from 'react'

interface ClientInfo {
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface RefillRow {
  id: string
  user_id: string
  refill_number: string
  status: string
  created_at: string
  client: ClientInfo | null
}

interface RefillsListProps {
  rows: RefillRow[]
}

const STATUSES = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] as const
type RefillStatus = (typeof STATUSES)[number]

function statusColor(status: string) {
  switch (status) {
    case 'NEW': return 'bg-yellow-100 text-yellow-800'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
    case 'COMPLETED': return 'bg-green-100 text-green-800'
    case 'CANCELED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function statusLabel(status: string) {
  return status.replace('_', ' ')
}

function formatAddress(client: ClientInfo) {
  const parts = [
    client.address_line1,
    client.address_line2,
    [client.city, client.state].filter(Boolean).join(', '),
    client.zip,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export function RefillsList({ rows }: RefillsListProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.map((r) => [r.id, r.status]))
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const previous = statuses[id]
    setStatuses((s) => ({ ...s, [id]: newStatus }))
    setSaving((s) => ({ ...s, [id]: true }))
    setErrors((e) => ({ ...e, [id]: '' }))

    try {
      const res = await fetch(`/api/owner/refills/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (err) {
      setStatuses((s) => ({ ...s, [id]: previous }))
      setErrors((e) => ({ ...e, [id]: err instanceof Error ? err.message : 'Error' }))
    } finally {
      setSaving((s) => ({ ...s, [id]: false }))
    }
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isOpen = openId === row.id
        const client = row.client
        const currentStatus = statuses[row.id] ?? row.status
        const fullName = client
          ? [client.first_name, client.last_name].filter(Boolean).join(' ') || null
          : null
        const address = client ? formatAddress(client) : null

        return (
          <div
            key={row.id}
            className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 shadow-sm"
          >
            {/* Row header — click to expand */}
            <button
              type="button"
              onClick={() => toggle(row.id)}
              className="w-full text-left px-4 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-expanded={isOpen}
              aria-controls={`refill-details-${row.id}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900">
                    Rx #{row.refill_number}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {client?.email || 'Unknown client'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(currentStatus)}`}>
                  {statusLabel(currentStatus)}
                </span>
                <span className="text-xs text-gray-500 hidden sm:block">
                  {new Date(row.created_at).toLocaleDateString()}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded client info + status control */}
            {isOpen && (
              <div
                id={`refill-details-${row.id}`}
                className="border-t border-gray-200/60 px-4 py-4 bg-gray-50/60"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Client information</h3>
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</dt>
                    <dd className="mt-0.5 text-gray-900">{fullName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                    <dd className="mt-0.5">
                      {client?.email ? (
                        <a href={`mailto:${client.email}`} className="text-primary-600 hover:underline">
                          {client.email}
                        </a>
                      ) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                    <dd className="mt-0.5">
                      {client?.phone ? (
                        <a href={`tel:${client.phone}`} className="text-primary-600 hover:underline">
                          {client.phone}
                        </a>
                      ) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</dt>
                    <dd className="mt-0.5 text-gray-900">{address || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</dt>
                    <dd className="mt-0.5 text-gray-900">
                      {new Date(row.created_at).toLocaleString()}
                    </dd>
                  </div>

                  {/* Status editor */}
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</dt>
                    <dd className="mt-0.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentStatus}
                          disabled={saving[row.id]}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{statusLabel(s)}</option>
                          ))}
                        </select>
                        {saving[row.id] && (
                          <span className="text-xs text-gray-500" aria-live="polite" role="status">Saving…</span>
                        )}
                      </div>
                      {errors[row.id] && (
                        <p className="mt-1 text-xs text-red-600" role="alert">{errors[row.id]}</p>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
