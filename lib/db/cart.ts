import type { SupabaseClient } from '@supabase/supabase-js'
import { CartItem } from '@/lib/types'

export async function getCartItemsWithProducts(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(
      `
      *,
      product:products(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { data: (data as (CartItem & { product?: any })[]) || [], error }
}

export async function getCartSummary(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, qty')
    .eq('user_id', userId)

  return { data: (data as Array<{ id: string; product_id: string; qty: number }>) || [], error }
}

export async function getCartItemByProduct(
  supabase: SupabaseClient,
  userId: string,
  productId: string
) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single()

  return { data: data as CartItem | null, error }
}

export async function addCartItem(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  qty: number
) {
  const { data, error } = await supabase
    .from('cart_items')
    .insert({ user_id: userId, product_id: productId, qty })
    .select('id, product_id, qty')
    .single()

  return { data, error }
}

export async function updateCartItemQty(
  supabase: SupabaseClient,
  itemId: string,
  qty: number
) {
  const { error } = await supabase.from('cart_items').update({ qty }).eq('id', itemId)
  return { error }
}

export async function deleteCartItem(supabase: SupabaseClient, itemId: string) {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId)
  return { error }
}

export async function clearCart(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId)
  return { error }
}
