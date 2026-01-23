import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

const allowedStatuses = new Set([
  'NEW',
  'CONFIRMED',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELED'
])

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = context.params
  let body: { status?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const status = body.status?.toUpperCase()
  if (!status || !allowedStatuses.has(status)) {
    return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
  }

  const serverSupabase = await supabaseServerClient()
  const { data, error } = await serverSupabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[order-status] update failed', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update order status',
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, order: data })
}
