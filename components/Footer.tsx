'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/db/supabaseClient'

const linkClass = 'text-gray-700 hover:text-primary-700 hover:underline focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded transition-colors'
const headingClass = 'text-xs font-bold uppercase tracking-widest text-gray-600 mb-3'

export function Footer() {
  const pathname = usePathname()
  const isAdminPath = pathname?.startsWith('/owner')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

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
            <h3 className={headingClass}>Contact</h3>
            <address className="text-gray-600 not-italic space-y-1">
              <p>
                Phone:{' '}
                <a href="tel:+12128776390" className={linkClass}>
                  (212) 877-6390
                </a>
              </p>
              <p>181 Amsterdam Ave, New York, NY 10023</p>
            </address>
          </div>
          <div>
            <h3 className={headingClass}>Quick links</h3>
            <ul className="space-y-2">
              {isAdminPath ? (
                <>
                  <li><Link href="/owner" className={linkClass}>Dashboard</Link></li>
                  <li><Link href="/owner/orders" className={linkClass}>Orders</Link></li>
                  <li><Link href="/owner/products" className={linkClass}>Products</Link></li>
                </>
              ) : isLoggedIn ? (
                <>
                  <li><Link href="/products" className={linkClass}>Products</Link></li>
                  <li><Link href="/orders" className={linkClass}>My Orders</Link></li>
                  <li><Link href="/refill" className={linkClass}>Refill</Link></li>
                </>
              ) : (
                <>
                  <li><Link href="/products" className={linkClass}>Products</Link></li>
                  <li><Link href="/login" className={linkClass}>Log In</Link></li>
                  <li><Link href="/signup" className={linkClass}>Sign Up</Link></li>
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
