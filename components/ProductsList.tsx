'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Product, ProductWithVariants } from '@/lib/types'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { addCartItem, deleteCartItem, getCartSummary, updateCartItemQty } from '@/lib/db/cart'
import { logger } from '@/lib/logger'
import { SearchAutocomplete } from '@/components/SearchAutocomplete'
import { SafetyBanner } from '@/components/SafetyBanner'
import { SearchSafetyWarning } from '@/lib/search/types'

const DEFAULT_DESCRIPTION = 'Quality healthcare product for home use.'

interface ProductsListProps {
  products: Product[]
  categories: string[]
  selectedCategory?: string
  searchQuery?: string
}

// Group products by base name and sort variants
function groupProductVariants(products: Product[]): ProductWithVariants[] {
  const groups: Record<string, ProductWithVariants> = {}
  
  products.forEach(product => {
    const baseKey = product.base_product_name || product.name
    
    if (!groups[baseKey]) {
      // First variant becomes the main product
      groups[baseKey] = { ...product, variants: [product] }
    } else {
      // Add as variant
      groups[baseKey].variants?.push(product)
    }
  })
  
  // Sort variants by size (numeric first, then alphabetic)
  Object.values(groups).forEach(group => {
    group.variants?.sort((a, b) => {
      const aSize = a.variant_size || ''
      const bSize = b.variant_size || ''
      
      // Try to parse as numbers
      const aNum = parseFloat(aSize)
      const bNum = parseFloat(bSize)
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      
      return aSize.localeCompare(bSize)
    })
  })
  
  return Object.values(groups)
}

export function ProductsList({ products, categories, selectedCategory, searchQuery }: ProductsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchQuery || '')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [cartByProduct, setCartByProduct] = useState<Record<string, { id: string; qty: number }>>({})
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [safetyWarnings, setSafetyWarnings] = useState<SearchSafetyWarning[]>([])
  // Group products by variants
  const groupedProducts = useMemo(() => groupProductVariants(products), [products])

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

  function handleSearch(nextQuery?: string, event?: React.FormEvent) {
    event?.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    const query = (nextQuery ?? search).trim()
    if (query) {
      params.set('search', query)
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

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    const query = params.toString()
    return query ? `/products?${query}` : '/products'
  }, [searchParams])

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <form onSubmit={(event) => handleSearch(undefined, event)} className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="search" className="sr-only">Search products</label>
          <SearchAutocomplete
            id="search"
            value={search}
            onChange={setSearch}
            onSubmit={handleSearch}
            onSafety={setSafetyWarnings}
            placeholder="Search products..."
            ariaLabel="Search products"
          />
          <button type="submit" className="btn-primary px-5">Search</button>
        </form>

        <SafetyBanner warnings={safetyWarnings} />

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
      {groupedProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No products found.</p>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search or browse a category below.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat}
                type="button"
                className="btn-secondary text-sm"
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groupedProducts.map((productGroup) => {
            const baseName = productGroup.base_product_name || productGroup.name
            const variants = productGroup.variants?.length ? productGroup.variants : [productGroup]
            const selectedVariantId = selectedVariants[baseName] || variants[0].id
            const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || variants[0]
            const hasMultipleVariants = variants.length > 1
            const titleText = baseName
            const detailText = selectedVariant.description?.trim() || DEFAULT_DESCRIPTION
            const sizeBadgeText =
              selectedVariant.variant_size && selectedVariant.variant_size.toLowerCase() !== 'standard'
                ? selectedVariant.variant_size
                : null
            return (
              <article
                key={selectedVariant.id}
                className="card group hover:shadow-lg transition-shadow flex flex-col h-full"
              >
                <Link
                  href={`/products/${selectedVariant.id}?returnTo=${encodeURIComponent(returnTo)}`}
                  className="block mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded flex-1"
                >
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold line-clamp-2 leading-6 h-12">
                      {titleText}
                    </h2>
                    {selectedVariant.image_url ? (
                      <div className="w-full h-48 rounded bg-white overflow-hidden relative">
                        <img
                          src={selectedVariant.image_url}
                          alt={`${baseName}${!hasMultipleVariants && sizeBadgeText ? ` (${sizeBadgeText})` : ''} - ${selectedVariant.category}`}
                          className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-110 group-hover:cursor-zoom-in"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-full h-48 bg-gray-200 rounded flex items-center justify-center relative"
                        aria-hidden="true"
                        role="img"
                        aria-label={`No image available for ${selectedVariant.name}`}
                      >
                        <span className="text-gray-400 sr-only">No image available</span>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 truncate leading-5 h-5">{selectedVariant.category}</p>
                  <p className="text-sm text-gray-500 line-clamp-2 leading-5 h-10">{detailText}</p>
                    <p className="text-sm leading-5 h-5">
                      {selectedVariant.in_stock ? (
                        <span className="text-transparent" aria-hidden="true">In stock</span>
                      ) : (
                        <span className="text-red-600">Out of Stock</span>
                      )}
                    </p>
                  </div>
                </Link>

              {/* Variant Selector */}
              <div className="mt-auto">
                <div className="mb-3 h-10 flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-primary-600 leading-7">
                    {selectedVariant.price_display}
                  </span>
                  {hasMultipleVariants ? (
                    <>
                      <label htmlFor={`size-${baseName}`} className="sr-only">
                        Option
                      </label>
                      <select
                        id={`size-${baseName}`}
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariants((prev) => ({ ...prev, [baseName]: e.target.value }))}
                        className="input text-sm h-10 min-w-[8rem] max-w-[12rem]"
                        aria-label={`Select option for ${baseName}`}
                      >
                        {variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.variant_size
                              ? `${variant.variant_size} - ${variant.price_display}`
                              : variant.price_display}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : sizeBadgeText ? (
                    <span
                      className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800"
                      aria-label={`Size ${sizeBadgeText}`}
                    >
                      {sizeBadgeText}
                    </span>
                  ) : null}
                </div>

              {/* Quick add controls (Instacart-style) */}
                <div className="min-h-[44px]">
                  {selectedVariant.in_stock ? (
                    cartByProduct[selectedVariant.id] ? (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => decrement(selectedVariant.id)}
                          disabled={isUpdating === selectedVariant.id}
                          className="btn-secondary w-12"
                          aria-label={`Decrease quantity of ${selectedVariant.name}`}
                          aria-busy={isUpdating === selectedVariant.id}
                        >
                          −
                        </button>
                        <div className="text-sm font-semibold text-gray-900 tabular-nums">
                          {cartByProduct[selectedVariant.id]?.qty}
                        </div>
                        <button
                          type="button"
                          onClick={() => increment(selectedVariant.id)}
                          disabled={isUpdating === selectedVariant.id}
                          className="btn-primary w-12"
                          aria-label={`Increase quantity of ${selectedVariant.name}`}
                          aria-busy={isUpdating === selectedVariant.id}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => increment(selectedVariant.id)}
                        disabled={isUpdating === selectedVariant.id}
                        className="btn-primary w-full"
                        aria-label={`Add ${selectedVariant.name} to cart`}
                        aria-busy={isUpdating === selectedVariant.id}
                      >
                        {isUpdating === selectedVariant.id ? 'Adding...' : 'Add'}
                      </button>
                    )
                  ) : (
                    <button type="button" disabled className="btn-secondary w-full" aria-disabled="true">
                      Out of stock
                    </button>
                  )}
                </div>
              </div>
            </article>
            )
          })}
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
