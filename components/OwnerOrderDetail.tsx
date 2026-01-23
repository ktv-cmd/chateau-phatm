'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Order, OrderItem } from '@/lib/types'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { getCustomerName } from '@/lib/db/owner'
import { markOrderSheetSync } from '@/lib/db/orders'
import { sendOrderToSheets } from '@/lib/sheets'

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
  const [isResending, setIsResending] = useState(false)

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

  async function handleResendToSheets() {
    setIsResending(true)
    // Try to get customer name from profile
    const { data: customerName } = await getCustomerName(supabaseClient, order.user_id)

    const result = await sendOrderToSheets(order, orderItems, customerEmail, customerName)

    if (result.success) {
      await markOrderSheetSync(supabaseClient, order.id, true)
    } else {
      await markOrderSheetSync(supabaseClient, order.id, false, result.error || 'Unknown error')
    }

    setIsResending(false)
    router.refresh()
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
        <h1 className="text-3xl font-bold mb-8">Order Details</h1>

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

          <div className="mb-4">
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

          {order.sheet_sync_failed && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-semibold mb-2">⚠️ Failed to sync to Google Sheets</p>
              {order.sheet_sync_error && (
                <p className="text-sm mb-2">{order.sheet_sync_error}</p>
              )}
              <button
                onClick={handleResendToSheets}
                disabled={isResending}
                className="btn-primary mt-2"
                aria-label="Resend order to Google Sheets"
                aria-disabled={isResending}
                aria-busy={isResending}
              >
                {isResending ? 'Resending...' : 'Resend to Sheets'}
              </button>
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
                <tr>
                  <td colSpan={2} className="font-semibold py-2 px-4">Total Items:</td>
                  <td className="text-right font-semibold py-2 px-4">{order.total_items}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
