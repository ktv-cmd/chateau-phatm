import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServiceClient } from '@/lib/db/supabaseServiceClient'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !isAdmin(currentUser.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role client to count all users (bypasses RLS)
    const supabase = supabaseServiceClient()

    // Count users in public.users table
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      return NextResponse.json({
        error: 'Failed to count users',
        details: usersError.message
      }, { status: 500 })
    }

    // Get list of all users (limited to 100 for preview)
    const { data: users, error: usersListError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (usersListError) {
      return NextResponse.json({
        error: 'Failed to fetch users',
        details: usersListError.message
      }, { status: 500 })
    }

    // Count customer profiles
    const { count: profilesCount, error: profilesError } = await supabase
      .from('customer_profiles')
      .select('*', { count: 'exact', head: true })

    if (profilesError) {
      return NextResponse.json({
        error: 'Failed to count profiles',
        details: profilesError.message
      }, { status: 500 })
    }

    // Count by admin status (hardcoded email)
    const owners = users?.filter(u => u.email?.toLowerCase() === 'admin@chateau-demo.com').length || 0
    const customers = (usersCount || 0) - owners

    return NextResponse.json({
      success: true,
      counts: {
        totalUsers: usersCount || 0,
        totalProfiles: profilesCount || 0,
        owners,
        customers
      },
      users: users?.map(u => ({
        email: u.email,
        isAdmin: u.email?.toLowerCase() === 'admin@chateau-demo.com',
        created_at: u.created_at,
        hasProfile: false // Will check below
      })) || [],
      summary: {
        totalActiveAccounts: usersCount || 0,
        accountsWithProfiles: profilesCount || 0,
        accountsWithoutProfiles: (usersCount || 0) - (profilesCount || 0)
      }
    })

  } catch (err: any) {
    return NextResponse.json({
      error: 'Failed to count users',
      details: err.message
    }, { status: 500 })
  }
}
