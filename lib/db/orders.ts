import type { SupabaseClient } from '@supabase/supabase-js'
import { Order, OrderItem } from '@/lib/types'

export async function listOrdersForUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { data: (data as Order[]) || [], error }
}

export async function listOrders(supabase: SupabaseClient, status?: string) {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (status) {
    query = query.eq('status', status)
  }
  const { data, error } = await query
  return { data: (data as Order[]) || [], error }
}

export async function getOrderById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).single()
  return { data: data as Order | null, error }
}

export async function getOrderItems(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId)
  return { data: (data as OrderItem[]) || [], error }
}

export async function createOrder(
  supabase: SupabaseClient,
  payload: Partial<Order> & Pick<Order, 'user_id' | 'status' | 'total_items'>
) {
  const { data, error } = await supabase.from('orders').insert(payload).select().single()
  return { data: data as Order | null, error }
}

export async function createOrderItems(
  supabase: SupabaseClient,
  items: Array<Omit<OrderItem, 'id' | 'created_at'>>
) {
  const { error } = await supabase.from('order_items').insert(items)
  return { error }
}

export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  status: Order['status']
) {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  return { error }
}

export async function markOrderSheetSync(
  supabase: SupabaseClient,
  orderId: string,
  success: boolean,
  error?: string | null
) {
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      sheet_sync_failed: !success,
      sheet_sync_error: success ? null : error || 'Unknown error'
    })
    .eq('id', orderId)

  return { error: updateError }
}
