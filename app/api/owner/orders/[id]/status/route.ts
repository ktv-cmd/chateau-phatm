import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { supabaseServiceClient } from '@/lib/db/supabaseServiceClient'

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
  if (!user || !isAdmin(user)) {
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

  // Fetch current status before update (for audit history)
  const { data: currentOrder } = await serverSupabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .single()

  const updatedByName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  const updatedByEmail = user.email
  const now = new Date().toISOString()

  const { data, error } = await serverSupabase
    .from('orders')
    .update({
      status,
      updated_at: now,
      updated_by_name: updatedByName,
      updated_by_email: updatedByEmail,
    })
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

  // Insert audit history using service role to bypass RLS on history table
  await supabaseServiceClient().from('order_status_history').insert({
    order_id: id,
    old_status: currentOrder?.status ?? null,
    new_status: status,
    updated_by_name: updatedByName,
    updated_by_email: updatedByEmail,
    updated_at: now,
  })

  return NextResponse.json({ success: true, order: data })
}
