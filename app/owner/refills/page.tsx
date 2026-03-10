import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServiceClient } from '@/lib/db/supabaseServiceClient'
import { RefillsList } from '@/components/RefillsList'

export default async function OwnerRefillRequestsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/products')

  const serviceSupabase = supabaseServiceClient()

  const { data: requests, error } = await serviceSupabase
    .from('refill_requests')
    .select('id, user_id, refill_number, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const requestRows = (requests || []) as {
    id: string
    user_id: string
    refill_number: string
    status: string
    created_at: string
  }[]

  const userIds = Array.from(new Set(requestRows.map((row) => row.user_id)))

  type ClientInfo = {
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

  let clientLookup: Record<string, ClientInfo> = {}

  if (userIds.length > 0) {
    const { data: users } = await serviceSupabase
      .from('users')
      .select('id, email')
      .in('id', userIds)

    const { data: profiles } = await serviceSupabase
      .from('customer_profiles')
      .select('user_id, first_name, last_name, phone, address_line1, address_line2, city, state, zip')
      .in('user_id', userIds)

    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [p.user_id, p])
    )

    for (const u of users || []) {
      const p = profileMap[u.id] || {}
      clientLookup[u.id] = {
        email: u.email,
        first_name: p.first_name || null,
        last_name: p.last_name || null,
        phone: p.phone || null,
        address_line1: p.address_line1 || null,
        address_line2: p.address_line2 || null,
        city: p.city || null,
        state: p.state || null,
        zip: p.zip || null,
      }
    }
  }

  const rows = requestRows.map((row) => ({
    ...row,
    client: clientLookup[row.user_id] || null,
  }))

  return (
    <div className="page">
      <section className="page-content py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Refill requests</h1>
            <p className="text-sm text-gray-600">Tap a row to see client details.</p>
          </div>
          <Link href="/owner" className="text-sm font-medium text-primary-700 hover:text-primary-800">
            Back to dashboard
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load refill requests.
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/60 bg-white/60 p-6 text-sm text-gray-600">
            No refill requests yet.
          </div>
        ) : (
          <RefillsList rows={rows} />
        )}
      </section>
    </div>
  )
}
