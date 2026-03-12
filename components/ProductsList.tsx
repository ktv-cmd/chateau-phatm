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
  /** Hide the inline search bar when a nav-level search input is already present */
  hideSearch?: boolean
  isAdmin?: boolean
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

export function ProductsList({ products, categories, selectedCategory, searchQuery: initialSearchQuery, hideSearch = false, isAdmin = false }: ProductsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [cartByProduct, setCartByProduct] = useState<Record<string, { id: string; qty: number }>>({})
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [searchValue, setSearchValue] = useState(initialSearchQuery || '')
  const [safetyWarnings, setSafetyWarnings] = useState<SearchSafetyWarning[]>([])
  // Group products by variants
  const groupedProducts = useMemo(() => groupProductVariants(products), [products])
  const isSearchMode = Boolean(searchParams?.get('search'))

  useEffect(() => {
    if (!isAdmin) loadCart()
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
      router.push(`/login?redirectedFrom=${encodeURIComponent(returnTo)}`)
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
      router.push(`/login?redirectedFrom=${encodeURIComponent(returnTo)}`)
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

  function handleSearchSubmit(q?: string) {
    const query = (q ?? searchValue).trim()
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div>
      {/* Inline search + safety banner (shown when there is no nav-level search) */}
      {!hideSearch && (
        <div className="mb-4">
          <label htmlFor="products-search" className="sr-only">
            Search products
          </label>
          <SearchAutocomplete
            id="products-search"
            value={searchValue}
            onChange={setSearchValue}
            onSubmit={handleSearchSubmit}
            onSafety={setSafetyWarnings}
            placeholder="Search products, brands, or categories…"
            ariaLabel="Search products"
          />
          <SafetyBanner warnings={safetyWarnings} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-4">
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
        <div
          className={
            isSearchMode
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
          }
        >
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
                className="card group hover:shadow-lg transition-shadow flex flex-col h-full p-4 sm:p-6"
              >
                <Link
                  href={`/products/${selectedVariant.id}?returnTo=${encodeURIComponent(returnTo)}`}
                  className={
                    isSearchMode
                      ? 'block mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded flex-1'
                      : 'block mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded flex-1'
                  }
                >
                  <div className={isSearchMode ? 'flex gap-3 sm:flex-col sm:gap-2' : 'flex flex-col gap-2'}>
                    <div
                      className={
                        isSearchMode
                          ? 'w-5/12 sm:w-full aspect-square sm:aspect-auto sm:h-48 rounded bg-white overflow-hidden relative'
                          : 'w-full aspect-square sm:aspect-auto sm:h-48 rounded bg-white overflow-hidden relative'
                      }
                      aria-hidden={selectedVariant.image_url ? undefined : 'true'}
                      role={selectedVariant.image_url ? undefined : 'img'}
                      aria-label={
                        selectedVariant.image_url ? undefined : `No image available for ${selectedVariant.name}`
                      }
                    >
                      {selectedVariant.image_url ? (
                        <img
                          src={selectedVariant.image_url}
                          alt={`${baseName}${!hasMultipleVariants && sizeBadgeText ? ` (${sizeBadgeText})` : ''} - ${selectedVariant.category}`}
                          className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-110 group-hover:cursor-zoom-in"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 sr-only">No image available</span>
                        </div>
                      )}
                    </div>
                    <div className={isSearchMode ? 'w-7/12 sm:w-full flex flex-col gap-2' : 'flex flex-col gap-2'}>
                      <h2 className="text-base sm:text-xl font-semibold line-clamp-2 leading-5 sm:leading-6 min-h-[2.5rem] sm:h-12">
                        {titleText}
                      </h2>
                      <p
                        className={
                          isSearchMode
                            ? 'text-xs sm:text-sm text-gray-600 leading-4 sm:leading-5 line-clamp-1 sm:truncate sm:h-5'
                            : 'text-xs sm:text-sm text-gray-600 truncate leading-4 sm:leading-5 h-4 sm:h-5'
                        }
                      >
                        {selectedVariant.category}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-4 sm:leading-5 min-h-[2rem] sm:h-10">
                        {detailText}
                      </p>
                      <p className="text-xs sm:text-sm leading-4 sm:leading-5 h-4 sm:h-5">
                        {selectedVariant.in_stock ? (
                          <span className="text-transparent" aria-hidden="true">In stock</span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </p>
                    </div>
                  </div>
                </Link>

              {/* Variant Selector */}
              <div className="mt-auto">
                <div className="mb-3 flex flex-wrap items-center gap-2 sm:h-10 sm:flex-nowrap sm:justify-between">
                  <span className="text-base sm:text-lg font-bold text-primary-600 leading-6 sm:leading-7">
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
                        className="input text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto sm:min-w-[8rem] sm:max-w-[12rem]"
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
                {!isAdmin && (
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
                )}
              </div>
            </article>
            )
          })}
        </div>
      )}

      {/* Sticky mini-cart (mobile-first) */}
      {!isAdmin && totalItems > 0 && (
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
