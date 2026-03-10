import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServiceClient } from '@/lib/db/supabaseServiceClient'

const allowedStatuses = new Set(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'])

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
    return NextResponse.json({ error: 'Invalid refill status' }, { status: 400 })
  }

  const supabase = supabaseServiceClient()
  const { data, error } = await supabase
    .from('refill_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[refill-status] update failed', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update refill status' },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json({ error: 'Refill request not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, refill: data })
}
