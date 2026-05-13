import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isSuperAdmin } from '@/lib/roles'
import { supabaseServiceClient } from '@/lib/db/supabaseServiceClient'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = supabaseServiceClient()
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[audit] list failed', error)
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 })
  }

  return NextResponse.json({ history: data || [] })
}
