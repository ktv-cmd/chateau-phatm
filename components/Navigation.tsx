'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { signOut } from '@/lib/auth'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { getCartSummary } from '@/lib/db/cart'
import { logger } from '@/lib/logger'
import { User } from '@/lib/types'
import { isAdmin } from '@/lib/roles'

export function Navigation() {
  const [user, setUser] = useState<User | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [sessionSynced, setSessionSynced] = useState(false)

  useEffect(() => {
    loadUser()
    loadCartCount()

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        loadUser()
        loadCartCount()
        if (event === 'SIGNED_IN' && session) {
          try {
            await fetch('/api/auth/set-session', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }),
            })
            setSessionSynced(true)
          } catch (syncError) {
            logger.error('[Navigation] Failed to sync session on sign-in:', syncError)
          }
        }
      }
    )

    const onCartUpdated = () => loadCartCount()
    window.addEventListener('cart:updated', onCartUpdated as EventListener)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('cart:updated', onCartUpdated as EventListener)
    }
  }, [])

  async function loadUser() {
    try {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser()
      
      if (!authUser) {
        setUser(null)
        return
      }

      if (!sessionSynced) {
        try {
          const { data: sessionData } = await supabaseClient.auth.getSession()
          if (sessionData.session) {
            await fetch('/api/auth/set-session', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
              }),
            })
            setSessionSynced(true)
          }
        } catch (syncError) {
          logger.error('[Navigation] Failed to sync server session:', syncError)
        }
      }

      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !data) {
        // Fallback: if public.users is blocked/misconfigured, still treat as logged-in
        // Admin is determined by email, not role
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at || new Date().toISOString(),
        } as User)
        return
      }

      setUser(data as User)
    } catch (err) {
      logger.error('[Navigation] Error in loadUser:', err)
      setUser(null)
    }
  }

  async function loadCartCount() {
    const { data: { user: authUser } } = await supabaseClient.auth.getUser()
    if (!authUser) {
      setCartCount(0)
      return
    }

    const { data, error } = await getCartSummary(supabaseClient, authUser.id)

    if (error) {
      setCartCount(0)
      return
    }
    const total = (data || []).reduce((sum, row: any) => sum + (row.qty || 0), 0)
    setCartCount(total)
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <nav
      className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 hover:text-gray-900 focus:text-gray-900"
              aria-label="Chateau Pharmacy home"
            >
              <span className="flex items-center gap-2">
                <img
                  src="/assets/chateau-logo.png"
                  alt="Chateau Drug & Homecare logo"
                  className="h-8 w-auto"
                />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500">
                Chateau Pharmacy
                </span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {isAdmin(user.email) ? (
                  <>
                    <Link
                      href="/owner"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/owner/products"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Products
                    </Link>
                    <Link
                      href="/owner/orders"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Orders
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/products"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Products
                    </Link>
                    <Link
                      href="/orders"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/profile"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Profile
                    </Link>
                  </>
                )}
                <Link
                  href="/cart"
                  className="relative px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={`Shopping cart with ${cartCount} items`}
                >
                  Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-sm" aria-hidden="true">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle mobile menu"
          >
            <span className="sr-only">Open main menu</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-gray-200/60 bg-white/70 backdrop-blur">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                {isAdmin(user.email) ? (
                  <>
                    <Link
                      href="/owner"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/owner/products"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Products
                    </Link>
                    <Link
                      href="/owner/orders"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Orders
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/products"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Products
                    </Link>
                    <Link
                      href="/orders"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </>
                )}
                <Link
                  href="/cart"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Cart {cartCount > 0 && `(${cartCount})`}
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    handleSignOut()
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="block px-3 py-2 rounded-md text-base font-medium text-primary-600 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
