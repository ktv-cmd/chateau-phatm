import { User, CustomerProfile } from './types'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

// Server-side function to get Supabase client with cookies
export async function getServerSupabase() {
  return supabaseServerClient()
}

export async function getCurrentUser(): Promise<User | null> {
  const serverSupabase = await getServerSupabase()

  const { data: authData, error: authError } = await serverSupabase.auth.getUser()
  if (authError || !authData?.user) return null

  const authUser = authData.user

  const { data, error } = await serverSupabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !data) {
    // Fallback: create user object from auth user
    return {
      id: authUser.id,
      email: authUser.email || '',
      created_at: (authUser as any).created_at || new Date().toISOString()
    } as User
  }
  return data as User
}

export async function getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const serverSupabase = await getServerSupabase()

  const { data, error } = await serverSupabase
    .from('customer_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as CustomerProfile
}
