import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listProducts, listProductCategories } from '@/lib/db/products'
import { logger } from '@/lib/logger'
import { OwnerProductsList } from '@/components/OwnerProductsList'

interface OwnerProductsPageProps {
  searchParams: { category?: string; search?: string; active?: string }
}

export default async function OwnerProductsPage({ searchParams }: OwnerProductsPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  if (!isAdmin(user.email)) {
    redirect('/products')
  }

  const serverSupabase = await supabaseServerClient()

  const { data: products, error } = await listProducts(serverSupabase, {
    category: searchParams.category,
    search: searchParams.search,
    active: searchParams.active
  })

  if (error) {
    logger.error('Error fetching products:', error)
  }

  const { data: categories } = await listProductCategories(serverSupabase)

  return (
    <OwnerProductsList
      products={products || []}
      categories={categories}
      selectedCategory={searchParams.category}
      searchQuery={searchParams.search}
      activeFilter={searchParams.active}
    />
  )
}
