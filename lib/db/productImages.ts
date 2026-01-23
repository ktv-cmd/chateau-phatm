import type { SupabaseClient } from '@supabase/supabase-js'
import { ProductImage } from '@/lib/types'

export async function listProductImages(supabase: SupabaseClient, productId: string) {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order')
  return { data: (data as ProductImage[]) || [], error }
}
