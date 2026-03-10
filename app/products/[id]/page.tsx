import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getProductById } from '@/lib/db/products'
import { ProductDetail } from '@/components/ProductDetail'

interface ProductPageProps {
  params: { id: string }
  searchParams?: { returnTo?: string }
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

  return <ProductDetail product={product} returnTo={searchParams?.returnTo} isAuthenticated={!!user} />
}
