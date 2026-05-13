import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = await supabaseServerClient()

  const [latestOrderRes, latestRefillRes, orderCountRes, refillCountRes] =
    await Promise.all([
      supabase
        .from('orders')
        .select('id, created_at')
        .eq('status', 'NEW')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('refill_requests')
        .select('id, created_at')
        .eq('status', 'NEW')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'NEW'),
      supabase
        .from('refill_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'NEW'),
    ])

  return NextResponse.json({
    latestOrderId: latestOrderRes.data?.[0]?.id ?? null,
    latestOrderAt: latestOrderRes.data?.[0]?.created_at ?? null,
    newOrderCount: orderCountRes.count ?? 0,
    latestRefillId: latestRefillRes.data?.[0]?.id ?? null,
    latestRefillAt: latestRefillRes.data?.[0]?.created_at ?? null,
    newRefillCount: refillCountRes.count ?? 0,
  })
}
