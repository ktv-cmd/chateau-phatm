'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Order, OrderWithItems } from '@/lib/types'
import { computeOrderTotal } from '@/lib/utils'

interface OwnerOrdersListProps {
  orders: OrderWithItems[]
  selectedStatus?: string
}

export function OwnerOrdersList({ orders, selectedStatus }: OwnerOrdersListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleStatusFilter(status: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (status) {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    router.push(`/owner/orders?${params.toString()}`)
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Orders</h1>

        <div className="mb-6">
          <label htmlFor="status-filter" className="label">Filter by Status</label>
          <select
            id="status-filter"
            value={selectedStatus || ''}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="input"
            aria-label="Filter orders by status"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="READY">Ready</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>

        {orders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No orders found.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full" aria-label="Orders table">
              <caption className="sr-only">List of all orders</caption>
              <thead>
                <tr className="border-b">
                  <th scope="col" className="text-left py-3 px-4">Order ID</th>
                  <th scope="col" className="text-left py-3 px-4">Date</th>
                  <th scope="col" className="text-left py-3 px-4">Status</th>
                  <th scope="col" className="text-right py-3 px-4">Items</th>
                  <th scope="col" className="text-right py-3 px-4">Total</th>
                  <th scope="col" className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/owner/orders/${order.id}`}
                        className="text-primary-600 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                      >
                        {order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                    <td className="text-right py-3 px-4">{order.total_items}</td>
                    <td className="text-right py-3 px-4 font-medium text-primary-700">
                      {computeOrderTotal(order.order_items || [])}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/owner/orders/${order.id}`}
                        className="btn-primary text-sm"
                        aria-label={`View order ${order.id.slice(0, 8)}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
