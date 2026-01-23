'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { addCartItem, deleteCartItem, getCartSummary, updateCartItemQty } from '@/lib/db/cart'
import { logger } from '@/lib/logger'

interface ProductsListProps {
  products: Product[]
  categories: string[]
  selectedCategory?: string
  searchQuery?: string
}

export function ProductsList({ products, categories, selectedCategory, searchQuery }: ProductsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchQuery || '')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [cartByProduct, setCartByProduct] = useState<Record<string, { id: string; qty: number }>>({})

  useEffect(() => {
    loadCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadCart() {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      setCartByProduct({})
      return
    }

    const { data, error } = await getCartSummary(supabaseClient, user.id)

    if (error) {
      logger.error('Failed to load cart:', error)
      return
    }

    const map: Record<string, { id: string; qty: number }> = {}
    for (const item of data || []) {
      map[item.product_id] = { id: item.id, qty: item.qty }
    }
    setCartByProduct(map)
  }

  const totalItems = useMemo(
    () => Object.values(cartByProduct).reduce((sum, v) => sum + (v.qty || 0), 0),
    [cartByProduct]
  )

  function notifyCartUpdated() {
    window.dispatchEvent(new CustomEvent('cart:updated'))
  }

  async function increment(productId: string) {
    setIsUpdating(productId)
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      setIsUpdating(null)
      router.push('/login')
      return
    }

    const existing = cartByProduct[productId]
    if (existing) {
      const newQty = existing.qty + 1
      const { error } = await updateCartItemQty(supabaseClient, existing.id, newQty)
      if (!error) {
        setCartByProduct((prev) => ({ ...prev, [productId]: { id: existing.id, qty: newQty } }))
        notifyCartUpdated()
      }
    } else {
      const { data, error } = await addCartItem(supabaseClient, user.id, productId, 1)
      if (!error && data) {
        setCartByProduct((prev) => ({ ...prev, [productId]: { id: data.id, qty: data.qty } }))
        notifyCartUpdated()
      }
    }

    setIsUpdating(null)
  }

  async function decrement(productId: string) {
    const existing = cartByProduct[productId]
    if (!existing) return

    setIsUpdating(productId)
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      setIsUpdating(null)
      router.push('/login')
      return
    }

    if (existing.qty <= 1) {
      const { error } = await deleteCartItem(supabaseClient, existing.id)
      if (!error) {
        setCartByProduct((prev) => {
          const next = { ...prev }
          delete next[productId]
          return next
        })
        notifyCartUpdated()
      }
    } else {
      const newQty = existing.qty - 1
      const { error } = await updateCartItemQty(supabaseClient, existing.id, newQty)
      if (!error) {
        setCartByProduct((prev) => ({ ...prev, [productId]: { id: existing.id, qty: newQty } }))
        notifyCartUpdated()
      }
    }

    setIsUpdating(null)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    router.push(`/products?${params.toString()}`)
  }

  function handleCategoryChange(category: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (category) {
      params.set('category', category)
    } else {
      params.delete('category')
    }
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="search" className="sr-only">Search products</label>
          <input
            id="search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="input flex-1"
            aria-label="Search products"
          />
          <button type="submit" className="btn-primary px-5">Search</button>
        </form>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="category-filter" className="label mb-0">Category</label>
          <select
            id="category-filter"
            value={selectedCategory || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="input max-w-xs"
            aria-label="Filter products by category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <article
              key={product.id}
              className="card hover:shadow-lg transition-shadow"
            >
              <Link
                href={`/products/${product.id}`}
                className="block mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              >
                <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={`${product.name} - ${product.category}`}
                    className="w-full h-48 object-cover rounded mb-4"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded mb-4 flex items-center justify-center" aria-hidden="true" role="img" aria-label={`No image available for ${product.name}`}>
                    <span className="text-gray-400 sr-only">No image available</span>
                  </div>
                )}
                <p className="text-gray-600 mb-2">{product.category}</p>
                {product.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{product.description}</p>
                )}
                <p className="text-lg font-bold text-primary-600">{product.price_display}</p>
                {!product.in_stock && (
                  <p className="text-sm text-red-600 mt-2">Out of Stock</p>
                )}
              </Link>

              {/* Quick add controls (Instacart-style) */}
              {product.in_stock ? (
                cartByProduct[product.id] ? (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => decrement(product.id)}
                      disabled={isUpdating === product.id}
                      className="btn-secondary w-12"
                      aria-label={`Decrease quantity of ${product.name}`}
                      aria-busy={isUpdating === product.id}
                    >
                      −
                    </button>
                    <div className="text-sm font-semibold text-gray-900 tabular-nums">
                      {cartByProduct[product.id]?.qty}
                    </div>
                    <button
                      type="button"
                      onClick={() => increment(product.id)}
                      disabled={isUpdating === product.id}
                      className="btn-primary w-12"
                      aria-label={`Increase quantity of ${product.name}`}
                      aria-busy={isUpdating === product.id}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => increment(product.id)}
                    disabled={isUpdating === product.id}
                    className="btn-primary w-full"
                    aria-label={`Add ${product.name} to cart`}
                    aria-busy={isUpdating === product.id}
                  >
                    {isUpdating === product.id ? 'Adding...' : 'Add'}
                  </button>
                )
              ) : (
                <button type="button" disabled className="btn-secondary w-full" aria-disabled="true">
                  Out of stock
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Sticky mini-cart (mobile-first) */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
          <Link
            href="/cart"
            className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur px-4 py-3 shadow-xl shadow-gray-900/10"
            aria-label={`View cart with ${totalItems} items`}
          >
            <span className="font-semibold text-gray-900">View cart</span>
            <span className="text-sm text-gray-600">{totalItems} item(s)</span>
          </Link>
        </div>
      )}
    </div>
  )
}
