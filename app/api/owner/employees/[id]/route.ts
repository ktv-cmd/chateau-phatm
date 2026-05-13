import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isSuperAdmin } from '@/lib/roles'
import { supabaseServiceClient } from '@/lib/db/supabaseServiceClient'

interface RouteContext {
  params: { id: string }
}

// DELETE: revoke admin access (set role back to CUSTOMER)
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (user.id === params.id) {
    return NextResponse.json({ error: 'Cannot remove your own account' }, { status: 400 })
  }

  const supabase = supabaseServiceClient()

  const { error } = await supabase
    .from('users')
    .update({ role: 'CUSTOMER' })
    .eq('id', params.id)

  if (error) {
    console.error('[employees] role revoke failed', error)
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
