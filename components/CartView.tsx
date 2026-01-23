'use client'

import { useState } from 'react'
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

  async function updateQuantity(itemId: string, newQty: number) {
    if (newQty < 1) return

    setIsUpdating(itemId)
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      setIsUpdating(null)
      return
    }

    await updateCartItemQty(supabaseClient, itemId, newQty)

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

    await deleteCartItem(supabaseClient, itemId)

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
            <Link href="/products" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        <div className="space-y-4 mb-8">
          {cartItems.map((item) => (
            <div key={item.id} className="card flex items-center gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">
                  {item.product?.name || 'Product'}
                </h2>
                <p className="text-gray-600 mb-2">{item.product?.category}</p>
                <p className="text-lg font-bold text-primary-600">
                  {item.product?.price_display || 'Call'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label htmlFor={`qty-${item.id}`} className="sr-only">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.qty - 1)}
                    disabled={isUpdating === item.id || item.qty <= 1}
                    className="btn-secondary w-10"
                    aria-label="Decrease quantity"
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
                    className="input w-20 text-center"
                    aria-label={`Quantity for ${item.product?.name || 'product'}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.qty + 1)}
                    disabled={isUpdating === item.id}
                    className="btn-secondary w-10"
                    aria-label="Increase quantity"
                    aria-disabled={isUpdating === item.id}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={isRemoving === item.id}
                  className="btn-danger"
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
              {cartItems.reduce((sum, item) => sum + item.qty, 0)}
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
