import type { SupabaseClient } from '@supabase/supabase-js'
import { Product } from '@/lib/types'

interface ProductsQuery {
  category?: string
  search?: string
  active?: string
}

export async function listProducts(
  supabase: SupabaseClient,
  { category, search, active }: ProductsQuery = {}
) {
  let query = supabase.from('products').select('*').order('name')

  if (category) {
    query = query.eq('category', decodeURIComponent(category))
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (active === 'active') {
    query = query.eq('is_active', true)
  }
  if (active === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error } = await query
  return { data: (data as Product[]) || [], error }
}

export async function listProductCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('products').select('category')
  const categories = Array.from(new Set((data || []).map((p: any) => p.category))).sort()
  return { data: categories, error }
}

export async function getProductById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  return { data: data as Product | null, error }
}

export async function createProduct(supabase: SupabaseClient, payload: Partial<Product>) {
  const { data, error } = await supabase.from('products').insert(payload).select().single()
  return { data: data as Product | null, error }
}

export async function updateProduct(supabase: SupabaseClient, id: string, payload: Partial<Product>) {
  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()
  return { data: data as Product | null, error }
}

export async function deleteProduct(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  return { error }
}
