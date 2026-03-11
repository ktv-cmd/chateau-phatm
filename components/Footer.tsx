'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Footer() {
  const pathname = usePathname()
  const isAdminPath = pathname?.startsWith('/owner')

  return (
    <footer className="mt-16 border-t border-gray-200/60 bg-white/60 backdrop-blur" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-3">Chateau Drug &amp; Homecare</h2>
            <p className="text-gray-600">
              Your trusted neighborhood pharmacy on the Upper West Side.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-900">Contact</h3>
            <address className="text-gray-600 not-italic space-y-1">
              <p>
                Phone:{' '}
                <a
                  href="tel:+12128776390"
                  className="font-medium text-gray-900 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                >
                  (212) 877-6390
                </a>
              </p>
              <p>181 Amsterdam Ave, New York, NY 10023</p>
            </address>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-900">Quick links</h3>
            <ul className="space-y-2 text-gray-600">
              {isAdminPath ? (
                <>
                  <li>
                    <Link href="/owner" className="font-medium text-gray-900 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/owner/orders" className="font-medium text-gray-900 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
                      Orders
                    </Link>
                  </li>
                  <li>
                    <Link href="/owner/products" className="font-medium text-gray-900 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
                      Products
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/products" className="font-medium text-gray-900 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
                      Products
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="font-medium text-gray-900 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
                      Log In
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="font-medium text-gray-900 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200/60 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Chateau Drug & Homecare. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
