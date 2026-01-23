import type { SupabaseClient } from '@supabase/supabase-js'
import { CustomerProfile } from '@/lib/types'

export async function upsertCustomerProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<CustomerProfile>,
  hasExisting: boolean
) {
  if (hasExisting) {
    const { error } = await supabase
      .from('customer_profiles')
      .update(payload)
      .eq('user_id', userId)
    return { error }
  }

  const { error } = await supabase.from('customer_profiles').insert({ ...payload, user_id: userId })
  return { error }
}
