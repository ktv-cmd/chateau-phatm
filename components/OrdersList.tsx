import Link from 'next/link'
import { Order, OrderWithItems } from '@/lib/types'
import { computeOrderTotal } from '@/lib/utils'

interface OrdersListProps {
  orders: OrderWithItems[]
  isOwner: boolean
}

export function OrdersList({ orders, isOwner }: OrdersListProps) {
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

  if (orders.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{isOwner ? 'Orders' : 'My Orders'}</h1>
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No orders found.</p>
            {!isOwner && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/products" className="btn-primary inline-block">
                  Browse Products
                </Link>
                <Link href="/refill" className="btn-secondary inline-block">
                  Make a Refill
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{isOwner ? 'Orders' : 'My Orders'}</h1>
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={isOwner ? `/owner/orders/${order.id}` : `/orders/${order.id}`}
              className="card block hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-xl font-semibold">Order #{order.id.slice(0, 8)}</h2>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
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
              <div className="flex items-center gap-4 mt-1">
                <p className="text-gray-700">Items: {order.total_items}</p>
                <p className="font-semibold text-primary-700">
                  Total: {computeOrderTotal(order.order_items || [])}
                </p>
              </div>
              {order.sheet_sync_failed && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Failed to sync to Google Sheets
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
