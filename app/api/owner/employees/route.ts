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
    .from('users')
    .select('id, email, first_name, last_name, role, created_at')
    .eq('role', 'ADMIN')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[employees] list failed', error)
    return NextResponse.json({ error: 'Failed to load employees' }, { status: 500 })
  }

  return NextResponse.json({ employees: data || [] })
}
