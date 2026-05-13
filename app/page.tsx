import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listProductCategories } from '@/lib/db/products'
import type { Product } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Home | Chateau Drug & Homecare',
  description: 'Your trusted neighborhood pharmacy on the Upper West Side. Fast, friendly service and local delivery.',
}

const DEFAULT_DESCRIPTION = 'Quality healthcare product for home use.'

async function submitRefillRequest(formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const rawRefillNumber = String(formData.get('refillNumber') || '').trim()
  if (!/^\d{6,8}$/.test(rawRefillNumber)) {
    redirect('/?refill=invalid')
  }

  const serverSupabase = await supabaseServerClient()
  const { error } = await serverSupabase.from('refill_requests').insert({
    user_id: user.id,
    refill_number: rawRefillNumber
  })

  if (error) {
    redirect('/?refill=error')
  }

  redirect('/?refill=success')
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const user = await getCurrentUser()
  const isAuthenticated = !!user
  const userIsAdmin = isAdmin(user)
  const refillStatus = typeof searchParams?.refill === 'string' ? searchParams.refill : undefined

  const serverSupabase = await supabaseServerClient()
  const { data: categories } = await listProductCategories(serverSupabase)

  const featuredCategories = (categories || []).slice(0, 6)

  const { data: featuredProducts } = featuredCategories.length > 0
    ? await serverSupabase
        .from('products')
        .select('*')
        .in('category', featuredCategories)
        .eq('is_active', true)
        .order('name')
    : { data: [] }

  const productsByCategory = new Map<string, Product[]>(
    featuredCategories.map((cat) => [cat, []])
  )
  for (const product of (featuredProducts as Product[]) || []) {
    const group = productsByCategory.get(product.category)
    if (group && group.length < 6) group.push(product)
  }
  const categoryGroups = featuredCategories.map((category) => ({
    category,
    products: productsByCategory.get(category) || [],
  }))

  return (
    <div className="page">
      <section className="page-content pt-10 pb-6">
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Find products fast
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Use the search bar above or browse by category.
          </p>
        </div>
      </section>

      {featuredCategories.length > 0 && (
        <section className="page-content pb-6 hidden sm:block" aria-label="Shop by category">
          <div className="flex items-center justify-end sm:justify-between gap-4">
            <h2 className="hidden sm:block text-lg font-semibold text-gray-900">Shop by category</h2>
            <Link href="/products" className="text-sm font-medium text-primary-700 hover:text-primary-800" aria-label="View all products">
              View all
            </Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {featuredCategories.map((category) => {
              const words = category.split(/[\s&\-/]+/).filter((w: string) => w.length > 1 && w.toLowerCase() !== 'the')
              const abbrev = words.length >= 2
                ? (words[0][0] + words[1][0]).toUpperCase()
                : category.trim().slice(0, 2).toUpperCase()
              return (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="min-w-[180px] flex-1 rounded-xl border border-gray-200/60 bg-white/80 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-semibold">
                      {abbrev}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {category}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {isAuthenticated && !userIsAdmin && (
        <section className="page-content pb-8">
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Refill a medication</h2>
              <p className="text-sm text-gray-600">
                Enter the 6–8 digit refill number from your prescription label.
              </p>
            </div>

            {refillStatus !== 'success' && (
              <>
                <form action={submitRefillRequest} className="mt-4 flex flex-col sm:flex-row gap-3">
                  <label htmlFor="refill-number" className="sr-only">
                    Refill number
                  </label>
                  <input
                    id="refill-number"
                    name="refillNumber"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6,8}"
                    minLength={6}
                    maxLength={8}
                    required
                    className="input sm:max-w-xs"
                    placeholder="Enter refill number"
                    aria-describedby="refill-helper"
                  />
                  <button type="submit" className="btn-primary px-6">
                    Request refill
                  </button>
                </form>
                <p id="refill-helper" className="mt-2 text-xs text-gray-500">
                  Example: 123456
                </p>
              </>
            )}

            {refillStatus === 'success' && (
              <p className="mt-3 text-sm text-green-600" role="status" aria-live="polite">Refill request sent to the pharmacy.</p>
            )}
            {refillStatus === 'invalid' && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                Please enter a valid 6–8 digit refill number.
              </p>
            )}
            {refillStatus === 'error' && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                We could not submit your request. Please try again.
              </p>
            )}
          </div>
        </section>
      )}

      {categoryGroups.length === 0 ? (
        <section className="page-content pb-12">
          <div className="card text-center">
            <h2 className="text-lg font-semibold text-gray-900">No categories available</h2>
            <p className="mt-2 text-sm text-gray-600">Please check back soon.</p>
          </div>
        </section>
      ) : (
        categoryGroups.map(({ category, products }) => (
          <section
            key={category}
            className="page-content pb-10"
            aria-labelledby={`category-${category}`}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id={`category-${category}`} className="text-xl font-semibold text-gray-900">
                {category}
              </h2>
              <Link
                href={`/products?category=${encodeURIComponent(category)}`}
                className="text-sm font-medium text-primary-700 hover:text-primary-800"
                aria-label={`View all ${category} products`}
              >
                View all
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-gray-200/60 bg-white/60 p-6 text-sm text-gray-600">
                No products available in this category yet.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => {
                  const description = product.description?.trim() || DEFAULT_DESCRIPTION
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}?returnTo=/`}
                      className="card p-4 sm:p-5 hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label={`View ${product.name}`}
                    >
                      <div className="flex gap-3 sm:flex-col sm:gap-2">
                        <div
                          className="w-5/12 sm:w-full aspect-square sm:aspect-auto sm:h-48 rounded bg-white overflow-hidden relative"
                          aria-hidden={product.image_url ? undefined : 'true'}
                          role={product.image_url ? undefined : 'img'}
                          aria-label={
                            product.image_url ? undefined : `No image available for ${product.name}`
                          }
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={`${product.name} - ${product.category}`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 sr-only">No image available</span>
                            </div>
                          )}
                        </div>
                        <div className="w-7/12 sm:w-full flex flex-col gap-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                            {product.category}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                            {description}
                          </p>
                          <p className="text-sm font-semibold text-primary-700">
                            {product.price_display}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  )
}
