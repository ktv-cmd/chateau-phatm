import Link from 'next/link'

interface OwnerDashboardProps {
  stats: {
    totalOrders: number
    totalProducts: number
    newOrders: number
  }
}

export function OwnerDashboard({ stats }: OwnerDashboardProps) {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Orders</h2>
            <p className="text-4xl font-bold text-primary-600">{stats.totalOrders}</p>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">New Orders</h2>
            <p className="text-4xl font-bold text-yellow-600">{stats.newOrders}</p>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Products</h2>
            <p className="text-4xl font-bold text-green-600">{stats.totalProducts}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/owner/products"
            className="card hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
          >
            <h2 className="text-2xl font-semibold mb-2">Manage Products</h2>
            <p className="text-gray-600">Add, edit, or remove products from the catalog</p>
          </Link>
          <Link
            href="/owner/orders"
            className="card hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
          >
            <h2 className="text-2xl font-semibold mb-2">Manage Orders</h2>
            <p className="text-gray-600">View and update order statuses</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
