'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Employee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  created_at: string
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const res = await fetch('/api/owner/employees')
    if (!res.ok) {
      setError('Failed to load employees.')
      setIsLoading(false)
      return
    }
    const data = await res.json()
    setEmployees(data.employees || [])
    setIsLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remove admin access for ${name}? They will keep their account and can still use the customer portal — they just won't be able to access the admin panel.`)) return
    setRemovingId(id)
    const res = await fetch(`/api/owner/employees/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      alert(data?.error || 'Failed to remove employee.')
    } else {
      await load()
    }
    setRemovingId(null)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
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
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-gray-500 mt-1 text-sm">All accounts with admin access. To add a new employee, ask them to register at <strong>/signup</strong> with a <strong>@chateau.com</strong> email — they will get admin access automatically.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="card text-center py-12 text-gray-500">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">No employees found.</div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full" aria-label="Employees">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th scope="col" className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                  <th scope="col" className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                  <th scope="col" className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Joined</th>
                  <th scope="col" className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || '—'
                  const isMainAdmin = emp.email?.toLowerCase() === 'admin@chateau-demo.com'
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{fullName}</span>
                        {isMainAdmin && (
                          <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Main Admin</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{emp.email}</td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {new Date(emp.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isMainAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemove(emp.id, fullName !== '—' ? fullName : emp.email)}
                            disabled={removingId === emp.id}
                            className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            {removingId === emp.id ? 'Removing...' : 'Remove Access'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
