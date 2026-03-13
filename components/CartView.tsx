'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CartItem } from '@/lib/types'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { deleteCartItem, updateCartItemQty } from '@/lib/db/cart'

interface CartViewProps {
  cartItems: (CartItem & { product?: any })[]
}

export function CartView({ cartItems: initialCartItems }: CartViewProps) {
  const router = useRouter()
  const [cartItems, setCartItems] = useState(initialCartItems)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  useEffect(() => {
    setCartItems(initialCartItems)
  }, [initialCartItems])

  function parsePriceDisplay(value?: string | null) {
    if (!value) return 0
    const match = value.replace(/,/g, '').match(/(\d+(\.\d+)?)/)
    if (!match) return 0
    const parsed = Number.parseFloat(match[1])
    return Number.isFinite(parsed) ? parsed : 0
  }

  async function updateQuantity(itemId: string, newQty: number) {
    if (newQty < 1) return

    setIsUpdating(itemId)
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      setIsUpdating(null)
      return
    }

    const { error } = await updateCartItemQty(supabaseClient, itemId, newQty)

    if (!error) {
      setCartItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, qty: newQty } : item))
      )
      window.dispatchEvent(new CustomEvent('cart:updated'))
    }

    setIsUpdating(null)
    router.refresh()
  }

  async function removeItem(itemId: string) {
    setIsRemoving(itemId)
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      setIsRemoving(null)
      return
    }

    const { error } = await deleteCartItem(supabaseClient, itemId)

    if (!error) {
      setCartItems((prev) => prev.filter((item) => item.id !== itemId))
      window.dispatchEvent(new CustomEvent('cart:updated'))
    }

    setIsRemoving(null)
    router.refresh()
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg mb-4">Your cart is empty.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/products" className="btn-primary inline-block">
                Browse Products
              </Link>
              <Link href="/refill" className="btn-secondary inline-block">
                Make a Refill
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cartItems.reduce((sum, item) => {
    const priceCents = item.product?.price_cents
    const price =
      typeof priceCents === 'number' ? priceCents / 100 : parsePriceDisplay(item.product?.price_display)
    return sum + price * item.qty
  }, 0)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        <div className="card p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Subtotal ({totalItems} item{totalItems === 1 ? '' : 's'})</p>
              <p className="text-2xl font-bold text-gray-900">${subtotal.toFixed(2)}</p>
            </div>
            <Link href="/checkout" className="btn-primary px-4 py-2 text-sm sm:text-base">
              Proceed to checkout
            </Link>
          </div>
        </div>
        <div className="space-y-4 mb-8">
          {cartItems.map((item) => (
            <div key={item.id} className="card p-3 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-20 sm:w-24">
                  {item.product?.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={`${item.product?.name || 'Product'} - ${item.product?.category || 'Category'}`}
                      className="w-full aspect-square rounded-xl bg-white object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full aspect-square rounded-xl bg-gray-200 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="text-gray-400 sr-only">No image available</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-sm sm:text-lg font-semibold leading-5">
                    {item.product?.name || 'Product'}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {item.product?.category}
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-primary-700 mt-1">
                    {item.product?.price_display || 'Call'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor={`qty-${item.id}`} className="sr-only">Quantity</label>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.qty - 1)}
                    disabled={isUpdating === item.id || item.qty <= 1}
                    className="btn-secondary w-9"
                    aria-label={`Decrease quantity of ${item.product?.name || 'item'}`}
                    aria-disabled={isUpdating === item.id || item.qty <= 1}
                  >
                    -
                  </button>
                  <input
                    id={`qty-${item.id}`}
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    disabled={isUpdating === item.id}
                    className="input w-16 text-center text-sm"
                    aria-label={`Quantity for ${item.product?.name || 'product'}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.qty + 1)}
                    disabled={isUpdating === item.id}
                    className="btn-secondary w-9"
                    aria-label={`Increase quantity of ${item.product?.name || 'item'}`}
                    aria-disabled={isUpdating === item.id}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={isRemoving === item.id}
                  className="btn-danger px-3 py-2 text-xs sm:text-sm"
                  aria-label={`Remove ${item.product?.name || 'item'} from cart`}
                  aria-disabled={isRemoving === item.id}
                  aria-busy={isRemoving === item.id}
                >
                  {isRemoving === item.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xl font-semibold">Total Items:</span>
            <span className="text-xl font-bold">
              {totalItems}
            </span>
          </div>
          <Link href="/checkout" className="btn-primary w-full text-center block text-lg py-3">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
