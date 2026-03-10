import Link from 'next/link'

interface OwnerDashboardProps {
  stats: {
    totalOrders: number
    totalProducts: number
    newOrders: number
    newRefills: number
  }
}

export function OwnerDashboard({ stats }: OwnerDashboardProps) {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-8">Chateau Drug &amp; Homecare — Admin Panel</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Total Orders</h2>
            <p className="text-3xl font-bold text-primary-600">{stats.totalOrders}</p>
          </div>
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 mb-1">New Orders</h2>
            <p className="text-3xl font-bold text-yellow-600">{stats.newOrders}</p>
          </div>
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 mb-1">New Refills</h2>
            <p className="text-3xl font-bold text-purple-600">{stats.newRefills}</p>
          </div>
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Total Products</h2>
            <p className="text-3xl font-bold text-green-600">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href="/owner/orders"
            className="card hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-start gap-4"
          >
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10l8 4 8-4V7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v10" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-semibold mb-1">Client Orders</h2>
              <p className="text-sm text-gray-600">View client orders, details and update statuses</p>
            </div>
          </Link>

          <Link
            href="/owner/refills"
            className="card hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-start gap-4"
          >
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4 6h16M4 10h4M4 14h4M4 18h4" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-semibold mb-1">Refill Requests</h2>
              <p className="text-sm text-gray-600">View medication refill submissions from clients</p>
            </div>
          </Link>

          <Link
            href="/owner/products"
            className="card hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-start gap-4"
          >
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l-1 13H7L6 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7a3 3 0 0 1 6 0" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-semibold mb-1">Products</h2>
              <p className="text-sm text-gray-600">Add, edit name, description, price and images</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
