import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-server'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listProductCategories } from '@/lib/db/products'
import { LandingSearch } from '../components/LandingSearch'

export default async function HomePage() {
  const user = await getCurrentUser()
  const isAuthenticated = !!user

  const serverSupabase = await supabaseServerClient()
  const { data: categories } = await listProductCategories(serverSupabase)

  const uniqueCategories = (categories || []).slice(0, 6)

  return (
    <div className="page">
      <section className="page-content pt-12 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-3 py-1">
              Fast local delivery • Homecare supplies
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
              Your trusted neighborhood pharmacy.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Upper West Side, New York, NY. Browse products, request items, and manage your orders from one place.
            </p>

            <div className="mt-6">
              <LandingSearch />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {!isAuthenticated ? (
                <>
                  <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                    Create account
                  </Link>
                  <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                    Log in
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/products" className="btn-primary px-6 py-3 text-base">
                    Shop products
                  </Link>
                  <Link href="/profile" className="btn-secondary px-6 py-3 text-base">
                    My profile
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold">Popular categories</h2>
            <p className="mt-1 text-sm text-gray-600">Jump into a category to start shopping.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {uniqueCategories.slice(0, 6).map((category) => (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="rounded-2xl border border-gray-200/60 bg-white/60 px-4 py-4 text-sm font-semibold text-gray-900 hover:bg-white/80 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {uniqueCategories.length > 0 && (
        <section className="page-content pb-12" aria-labelledby="categories-heading">
          <div className="card">
            <div className="flex items-center justify-between gap-4">
              <h2 id="categories-heading" className="text-xl font-semibold">Shop by category</h2>
              <Link href="/products" className="text-sm font-medium text-primary-700 hover:text-primary-800">
                View all
              </Link>
            </div>
            <nav aria-label="Product categories">
              <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {uniqueCategories.map((category) => (
                  <Link
                    key={category}
                    href={`/products?category=${encodeURIComponent(category)}`}
                    className="rounded-2xl border border-gray-200/60 bg-white/60 px-4 py-4 text-center shadow-sm hover:bg-white/80 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label={`Browse ${category} products`}
                  >
                    <h3 className="font-semibold text-gray-900">{category}</h3>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </section>
      )}
    </div>
  )
}
