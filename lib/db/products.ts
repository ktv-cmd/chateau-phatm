import type { SupabaseClient } from '@supabase/supabase-js'
import { Product } from '@/lib/types'
import { fixtureProducts } from '@/lib/search/fixtures'
import { normalizeQuery } from '@/lib/search/normalizeQuery'

interface ProductsQuery {
  category?: string
  search?: string
  active?: string
}

function splitSearchTerms(value: string): string[] {
  return value
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
}

export async function listProducts(
  supabase: SupabaseClient,
  { category, search, active }: ProductsQuery = {}
) {
  const useFixture =
    process.env.SEARCH_DATA_SOURCE === 'fixture' || process.env.SEARCH_FIXTURE_MODE === 'true'

  if (useFixture) {
    const normalized = normalizeQuery(search || '')
    let filtered = fixtureProducts as Product[]
    if (category) {
      filtered = filtered.filter((item) => item.category === decodeURIComponent(category))
    }
    if (normalized) {
      filtered = filtered.filter((item) => {
        const haystack = [
          item.name,
          item.base_product_name,
          item.description,
          item.brand,
          item.category,
          item.sku,
          item.variant_size
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalized)
      })
    }
    if (active === 'active') {
      filtered = filtered.filter((item) => item.is_active !== false)
    }
    if (active === 'inactive') {
      filtered = filtered.filter((item) => item.is_active === false)
    }
    return { data: filtered, error: null }
  }

  let query = supabase.from('products').select('*').order('name')

  if (category) {
    query = query.eq('category', decodeURIComponent(category))
  }

  if (search) {
    const trimmed = search.trim()
    if (trimmed) {
      const terms = splitSearchTerms(normalizeQuery(trimmed))
      const columns = [
        'name',
        'base_product_name',
        'description',
        'brand',
        'category',
        'sku',
        'variant_size'
      ]
      for (const term of terms) {
        const orFilters = columns.map((col) => `${col}.ilike.%${term}%`).join(',')
        query = query.or(orFilters)
      }
    }
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
  const useFixture =
    process.env.SEARCH_DATA_SOURCE === 'fixture' || process.env.SEARCH_FIXTURE_MODE === 'true'
  if (useFixture) {
    const categories = Array.from(new Set((fixtureProducts || []).map((p: any) => p.category))).sort()
    return { data: categories, error: null }
  }
  const { data, error } = await supabase.from('products').select('category')
  const categories = Array.from(new Set((data || []).map((p: any) => p.category))).sort()
  return { data: categories, error }
}

export async function getProductById(supabase: SupabaseClient, id: string) {
  const useFixture =
    process.env.SEARCH_DATA_SOURCE === 'fixture' || process.env.SEARCH_FIXTURE_MODE === 'true'
  if (useFixture) {
    const item = (fixtureProducts as Product[]).find((product) => product.id === id) || null
    return { data: item, error: null }
  }
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  return { data: data as Product | null, error }
}

export async function getProductVariants(supabase: SupabaseClient, product: Product): Promise<Product[]> {
  const baseName = product.base_product_name
  if (!baseName) return [product]

  const useFixture =
    process.env.SEARCH_DATA_SOURCE === 'fixture' || process.env.SEARCH_FIXTURE_MODE === 'true'

  if (useFixture) {
    const siblings = (fixtureProducts as Product[]).filter(
      (p) => p.base_product_name === baseName && p.is_active !== false
    )
    return siblings.length > 1 ? siblings : [product]
  }

  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('base_product_name', baseName)
    .eq('is_active', true)
    .order('variant_size')
  const siblings = (data as Product[]) || []
  return siblings.length > 1 ? siblings : [product]
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
