'use client'

import { Order, OrderItem } from '@/lib/types'

interface OrderDetailProps {
  order: Order
  orderItems: OrderItem[]
  showSuccess?: boolean
}

export function OrderDetail({ order, orderItems, showSuccess }: OrderDetailProps) {

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
        {showSuccess && (
          <div
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold">Order placed successfully!</p>
            <p className="mt-1">
              Your request was received. If you do not hear from us shortly, please contact the pharmacy.
            </p>
          </div>
        )}

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
            </div>
            {getStatusBadge(order.status)}
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
              <p className="font-semibold">⚠️ Failed to sync to Google Sheets</p>
              {order.sheet_sync_error && (
                <p className="mt-1 text-sm">{order.sheet_sync_error}</p>
              )}
            </div>
          )}
        </div>

        <div className="card mb-6">
          <h2 className="text-2xl font-semibold mb-4">Order Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Order items">
              <caption className="sr-only">List of items in this order</caption>
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

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-blue-800">
            <strong>Note:</strong> Payment is handled by the pharmacy after order review.
          </p>
        </div>
      </div>
    </div>
  )
}
