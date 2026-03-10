'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Order, OrderItem } from '@/lib/types'
import { computeOrderTotal } from '@/lib/utils'

interface OwnerOrderDetailProps {
  order: Order
  orderItems: OrderItem[]
  customerEmail: string
}

export function OwnerOrderDetail({ order, orderItems, customerEmail }: OwnerOrderDetailProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<Order['status']>(order.status)
  const [statusError, setStatusError] = useState<string | null>(null)

  async function handleStatusUpdate() {
    setIsUpdating(true)
    setStatusError(null)
    const response = await fetch(`/api/owner/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setStatusError(payload?.error || 'Unable to update order status.')
      setIsUpdating(false)
      return
    }

      router.refresh()
    setIsUpdating(false)
  }

  function getStatusBadge(status: Order['status']) {
    switch (status) {
      case 'NEW':
        return <span className="badge-new">New</span>
      case 'CONFIRMED':
        return <span className="badge-confirmed">Confirmed</span>
      case 'READY':
        return <span className="badge-ready">Ready</span>
      case 'OUT_FOR_DELIVERY':
        return <span className="badge-delivery">Out for Delivery</span>
      case 'COMPLETED':
        return <span className="badge-ready">Completed</span>
      case 'CANCELED':
        return <span className="badge-cancelled">Canceled</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Top navigation — hidden when printing */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to orders
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            aria-label="Print order"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 14h12v8H6z" />
            </svg>
            Print Order
          </button>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-800">
          <p className="text-sm text-gray-500 mb-1">Order Receipt</p>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Printed on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <h1 className="text-3xl font-bold mb-8 print:hidden">Order Details</h1>

        <div className="card mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Order #{order.id.slice(0, 8)}</h2>
              <p className="text-gray-600">
                Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-gray-600 mt-1">Customer: {customerEmail}</p>
            </div>
            {getStatusBadge(order.status)}
          </div>

          <div className="mb-4 print:hidden">
            <label htmlFor="status-select" className="label">Update Status</label>
            <div className="flex gap-4">
              <select
                id="status-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Order['status'])}
                className="input flex-1"
                aria-label="Order status"
              >
                <option value="NEW">New</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="READY">Ready</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELED">Canceled</option>
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating || newStatus === order.status}
                className="btn-primary"
                aria-label="Update order status"
                aria-disabled={isUpdating || newStatus === order.status}
                aria-busy={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
            {statusError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {statusError}
              </p>
            )}
          </div>

          {order.delivery_address_snapshot && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Delivery Address</h3>
              <address className="text-gray-700 not-italic">
                {order.delivery_address_snapshot.line1}
                {order.delivery_address_snapshot.line2 && (
                  <><br />{order.delivery_address_snapshot.line2}</>
                )}
                <br />
                {order.delivery_address_snapshot.city}, {order.delivery_address_snapshot.state} {order.delivery_address_snapshot.zip}
              </address>
            </div>
          )}

          {order.phone_snapshot && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Phone</h3>
              <p className="text-gray-700">{order.phone_snapshot}</p>
            </div>
          )}

          {order.notes && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}

        </div>

        <div className="card mb-6">
          <h2 className="text-2xl font-semibold mb-4">Order Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Order items">
              <caption className="sr-only">Items in this order</caption>
              <thead>
                <tr className="border-b">
                  <th scope="col" className="text-left py-2 px-4">Product</th>
                  <th scope="col" className="text-right py-2 px-4">Quantity</th>
                  <th scope="col" className="text-right py-2 px-4">Price</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 px-4">{item.product_name_snapshot}</td>
                    <td className="text-right py-2 px-4">{item.qty}</td>
                    <td className="text-right py-2 px-4">{item.price_display_snapshot}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={2} className="font-semibold py-2 px-4">Total Items:</td>
                  <td className="text-right font-semibold py-2 px-4">{order.total_items}</td>
                </tr>
                <tr className="border-t">
                  <td colSpan={2} className="font-semibold py-2 px-4">Order Total:</td>
                  <td className="text-right font-semibold py-2 px-4 text-primary-700">
                    {computeOrderTotal(orderItems)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
