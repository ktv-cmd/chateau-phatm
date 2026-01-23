import { NextResponse } from 'next/server'
import { supabaseServiceClient } from '@/lib/db/supabaseServiceClient'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !isAdmin(currentUser.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role client to check auth.users (bypasses RLS)
    const supabase = supabaseServiceClient()

    // Check auth.users directly (requires service role)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({
        error: 'Failed to check auth users',
        details: authError.message
      }, { status: 500 })
    }

    // Check public.users table
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false })

    if (publicError) {
      return NextResponse.json({
        error: 'Failed to check public users',
        details: publicError.message
      }, { status: 500 })
    }

    // Compare auth.users vs public.users
    const authUserIds = new Set(authUsers.users.map(u => u.id))
    const publicUserIds = new Set(publicUsers?.map(u => u.id) || [])

    const missingInPublic = authUsers.users.filter(u => !publicUserIds.has(u.id))
    const missingInAuth = publicUsers?.filter(u => !authUserIds.has(u.id)) || []

    return NextResponse.json({
      success: true,
      counts: {
        authUsers: authUsers.users.length,
        publicUsers: publicUsers?.length || 0,
        missingInPublic: missingInPublic.length,
        missingInAuth: missingInAuth.length
      },
      authUsers: authUsers.users.map(u => ({
        id: u.id,
        email: u.email,
        emailConfirmed: u.email_confirmed_at ? true : false,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at
      })),
      publicUsers: publicUsers?.map(u => ({
        id: u.id,
        email: u.email,
        isAdmin: u.email?.toLowerCase() === 'admin@chateau-demo.com',
        createdAt: u.created_at
      })) || [],
      missingInPublic: missingInPublic.map(u => ({
        id: u.id,
        email: u.email,
        emailConfirmed: u.email_confirmed_at ? true : false,
        reason: 'User exists in auth.users but not in public.users - trigger may not have fired'
      })),
      issues: [
        ...(missingInPublic.length > 0 ? [`${missingInPublic.length} user(s) exist in auth.users but not in public.users. The trigger may not have fired.`] : []),
        ...(missingInAuth.length > 0 ? [`${missingInAuth.length} user(s) exist in public.users but not in auth.users. This should not happen.`] : [])
      ]
    })

  } catch (err: any) {
    return NextResponse.json({
      error: 'Failed to check users',
      details: err.message
    }, { status: 500 })
  }
}
