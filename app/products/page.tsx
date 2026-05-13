import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

export const metadata: Metadata = {
  title: 'Shop | Chateau Drug & Homecare',
  description: 'Browse our full range of healthcare and homecare products.',
}
import { listProducts, listProductCategories } from '@/lib/db/products'
import { logger } from '@/lib/logger'
import { ProductsList } from '@/components/ProductsList'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'

interface ProductsPageProps {
  searchParams: { category?: string; search?: string; welcome?: string }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const user = await getCurrentUser()
  const userIsAdmin = isAdmin(user)
  const serverSupabase = await supabaseServerClient()

  const { data: products, error } = await listProducts(serverSupabase, {
    category: searchParams.category,
    search: searchParams.search,
    active: 'active'
  })

  if (error) {
    logger.error('Error fetching products:', error)
  }

  const { data: categories } = await listProductCategories(serverSupabase)

  return (
    <div className="page py-10">
      <div className="page-content">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
            <p className="mt-1 text-gray-600">Search, filter by category, then add items to your cart.</p>
          </div>
          {!userIsAdmin && (
            <div className="hidden md:block">
              <Link href="/cart" className="btn-secondary">View cart</Link>
            </div>
          )}
        </div>

        {searchParams.welcome === 'true' && (
          <div
            className="mb-6 rounded-2xl border border-primary-100 bg-primary-50/60 px-4 py-3 text-primary-900"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm">
              <span className="font-semibold">Welcome!</span> You can start shopping now. Want faster checkout?{' '}
              <Link href="/profile" className="font-medium underline underline-offset-2 text-primary-700 hover:text-primary-800">
                Complete your profile
              </Link>
              .
            </p>
          </div>
        )}

        <Suspense fallback={<div role="status" aria-live="polite" className="py-8 text-center text-gray-600">Loading products…</div>}>
          <ProductsList
            products={products || []}
            categories={categories}
            selectedCategory={searchParams.category}
            searchQuery={searchParams.search}
            hideSearch
            isAdmin={userIsAdmin}
          />
        </Suspense>
      </div>
    </div>
  )
}
