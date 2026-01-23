import { User, CustomerProfile } from './types'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

// Server-side function to get Supabase client with cookies
export async function getServerSupabase() {
  return supabaseServerClient()
}

export async function getCurrentUser(): Promise<User | null> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-server.ts:9',message:'getCurrentUser called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const serverSupabase = await getServerSupabase()

  const { data: authData, error: authError } = await serverSupabase.auth.getUser()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-server.ts:13',message:'getUser result',data:{hasError:!!authError,errorMessage:authError?.message||null,hasUser:!!authData?.user,userId:authData?.user?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  if (authError || !authData?.user) return null

  const authUser = authData.user

  const { data, error } = await serverSupabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-server.ts:18',message:'users query result',data:{hasError:!!error,errorMessage:error?.message||null,hasData:!!data,userId:data?.id||null,userRole:data?.role||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

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
