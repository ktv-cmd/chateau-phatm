import type { SupabaseClient } from '@supabase/supabase-js'

export async function getOwnerStats(supabase: SupabaseClient) {
  const [ordersResult, productsResult, newOrdersResult] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'NEW')
  ])

  const refillsResult = await supabase
    .from('refill_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'NEW')

  return {
    totalOrders: ordersResult.count || 0,
    totalProducts: productsResult.count || 0,
    newOrders: newOrdersResult.count || 0,
    newRefills: refillsResult.count || 0
  }
}

export async function getCustomerEmail(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  return { data: data?.email || '', error }
}

export async function getCustomerName(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('first_name, last_name')
    .eq('user_id', userId)
    .single()

  const name =
    data?.first_name && data?.last_name ? `${data.first_name} ${data.last_name}` : undefined

  return { data: name, error }
}
