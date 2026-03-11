import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getProductById, getProductVariants } from '@/lib/db/products'
import { ProductDetail } from '@/components/ProductDetail'
import type { Metadata } from 'next'

interface ProductPageProps {
  params: { id: string }
  searchParams?: { returnTo?: string }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const serverSupabase = await supabaseServerClient()
  const { data: product } = await getProductById(serverSupabase, params.id)
  if (!product) return { title: 'Product Not Found | Chateau Drug & Homecare' }
  const title = product.base_product_name || product.name
  return {
    title: `${title} | Chateau Drug & Homecare`,
  }
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const user = await getCurrentUser()

  const serverSupabase = await supabaseServerClient()

  const { data: product, error } = await getProductById(serverSupabase, params.id)

  if (error || !product) {
    notFound()
  }

  if (!user && product.is_active === false) {
    notFound()
  }

  if (user && !isAdmin(user.email) && product.is_active === false) {
    notFound()
  }

  const variants = await getProductVariants(serverSupabase, product)

  return <ProductDetail product={product} variants={variants} returnTo={searchParams?.returnTo} isAuthenticated={!!user} />
}
