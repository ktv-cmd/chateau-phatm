'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/lib/types'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { addCartItem, getCartItemByProduct, updateCartItemQty } from '@/lib/db/cart'

interface ProductDetailProps {
  product: Product
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  async function handleAddToCart() {
    setIsAdding(true)
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      setIsAdding(false)
      router.push('/login')
      return
    }

    // Check if item already in cart
    const { data: existing } = await getCartItemByProduct(supabaseClient, user.id, product.id)

    if (existing) {
      // Update quantity
      await updateCartItemQty(supabaseClient, existing.id, existing.qty + quantity)
    } else {
      // Add new item
      await addCartItem(supabaseClient, user.id, product.id, quantity)
    }

    setIsAdding(false)
    router.push('/cart')
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex space-x-2 text-sm text-gray-600">
            <li><a href="/products" className="hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">Products</a></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900">{product.name}</li>
          </ol>
        </nav>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={`${product.name} - ${product.category}${product.brand ? ` by ${product.brand}` : ''}`}
                className="w-full h-96 object-cover rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center" role="img" aria-label={`No image available for ${product.name}`}>
                <span className="sr-only">No image available for {product.name}</span>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-lg text-gray-600 mb-2">{product.category}</p>
            {product.brand && (
              <p className="text-sm text-gray-500 mb-4">Brand: {product.brand}</p>
            )}
            <p className="text-3xl font-bold text-primary-600 mb-6">{product.price_display}</p>

            {product.description && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-gray-700">{product.description}</p>
              </div>
            )}

            {product.in_stock ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="quantity" className="label">Quantity</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="btn-secondary w-12"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input w-20 text-center"
                      aria-label="Product quantity"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="btn-secondary w-12"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="btn-primary w-full text-lg py-3"
                  aria-label={`Add ${quantity} ${product.name} to cart`}
                  aria-disabled={isAdding}
                  aria-busy={isAdding}
                >
                  {isAdding ? 'Adding to Cart...' : 'Add to Cart'}
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p>This product is currently out of stock.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
