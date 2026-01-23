import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/auth-server'

export async function POST(request: Request) {
  try {
    // Get authenticated user from request
    const serverSupabase = await getServerSupabase()
    
    if (!serverSupabase) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 })
    }

    const { data: { user: authUser } } = await serverSupabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 })
    }

    // Check if user already exists in public.users
    const { data: existingUser } = await serverSupabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single()

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user: existingUser
      })
    }

    // Create user record in public.users
    const { data: newUser, error: insertError } = await serverSupabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email || '',
        role: 'CUSTOMER'
      })
      .select()
      .single()

    if (insertError) {
      // If it's a duplicate key error, user was created by trigger
      if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
        // Fetch the existing user
        const { data: createdUser } = await serverSupabase
          .from('users')
          .select('id, email, role')
          .eq('id', authUser.id)
          .single()

        return NextResponse.json({
          success: true,
          message: 'User created successfully (by trigger)',
          user: createdUser
        })
      }

      return NextResponse.json({
        error: 'Failed to create user record',
        details: insertError.message,
        code: insertError.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    })

  } catch (err: any) {
    return NextResponse.json({
      error: 'Failed to create user',
      details: err.message
    }, { status: 500 })
  }
}
