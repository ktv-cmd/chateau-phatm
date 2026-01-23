import type { SupabaseClient } from '@supabase/supabase-js'

export async function getUserEmail(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  return { data: data?.email || '', error }
}
