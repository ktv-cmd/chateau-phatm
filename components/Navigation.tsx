'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SearchAutocomplete } from '@/components/SearchAutocomplete'
import { SafetyBanner } from '@/components/SafetyBanner'
import { SearchSafetyWarning } from '@/lib/search/types'
import { signOut } from '@/lib/auth'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { getCartSummary } from '@/lib/db/cart'
import { logger } from '@/lib/logger'
import { User } from '@/lib/types'
import { isAdminEmail, isSuperAdmin } from '@/lib/roles'

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [sessionSynced, setSessionSynced] = useState(false)
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '')
  const [safetyWarnings, setSafetyWarnings] = useState<SearchSafetyWarning[]>([])
  const userIsAdmin = isAdminEmail(user?.email)
  const userIsSuperAdmin = isSuperAdmin(user?.email)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // Keep search input in sync when URL search param changes (e.g. back/forward navigation)
  useEffect(() => {
    setSearchValue(searchParams.get('search') ?? '')
  }, [searchParams])

  // Mobile menu: focus management, focus trap, and Escape key
  useEffect(() => {
    if (!isMenuOpen) return

    // Move focus to first focusable element in the menu
    const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusable && focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50)
    }

    // Focus trap
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
        menuButtonRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(
        mobileMenuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  useEffect(() => {
    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        loadUser()
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

    const onCartUpdated = () => loadUser()
    window.addEventListener('cart:updated', onCartUpdated as EventListener)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('cart:updated', onCartUpdated as EventListener)
    }
  }, [])

  useEffect(() => {
    loadUser()
    setIsMenuOpen(false)
  }, [pathname])

  async function loadUser() {
    try {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser()
      
      if (!authUser) {
        setUser(null)
        setCartCount(0)
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

      const resolvedUser: User = (error || !data)
        ? { id: authUser.id, email: authUser.email || '', created_at: authUser.created_at || new Date().toISOString() } as User
        : data as User

      setUser(resolvedUser)
      loadCartCount(authUser.id)
    } catch (err) {
      logger.error('[Navigation] Error in loadUser:', err)
      setUser(null)
    }
  }

  async function loadCartCount(userId?: string) {
    if (!userId) {
      setCartCount(0)
      return
    }

    const { data, error } = await getCartSummary(supabaseClient, userId)

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

  function submitSearch(nextQuery?: string) {
    const query = (nextQuery ?? searchValue).trim()
    if (!query) {
      router.push('/products')
      return
    }
    router.push(`/products?search=${encodeURIComponent(query)}`)
  }

  function isActivePath(path: string) {
    if (path === '/') return pathname === '/'
    return Boolean(pathname?.startsWith(path))
  }

  return (
    <>
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
                aria-label="Chateau Drug & Homecare home"
              >
                <span className="flex items-center gap-2">
                  <img
                    src="/assets/chateau-logo.png"
                    alt=""
                    className="h-8 w-auto"
                  />
                <span className="text-primary-700">
                  Chateau Drug & Homecare
                  </span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  {userIsAdmin ? (
                    <>
                      <Link
                        href="/owner"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/owner/products"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Products
                      </Link>
                      <Link
                        href="/owner/orders"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Orders
                      </Link>
                      <Link
                        href="/owner/refills"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Refills
                      </Link>
                      {userIsSuperAdmin && (
                        <Link
                          href="/owner/employees"
                          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          Employees
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link
                        href="/products"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Products
                      </Link>
                      <Link
                        href="/refill"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Refill
                      </Link>
                      <Link
                        href="/orders"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        My Orders
                      </Link>
                      <Link
                        href="/profile"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Profile
                      </Link>
                    </>
                  )}
                  {!userIsAdmin && (
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
                  )}
                  <button
                    onClick={handleSignOut}
                      className="px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
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

          </div>
        </div>

        {!userIsAdmin && (
          <div className="border-t border-gray-200/60 bg-white/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submitSearch()
                }}
                className="flex items-center gap-2"
                role="search"
              >
                <label htmlFor="nav-search" className="sr-only">
                  Search products
                </label>
                <SearchAutocomplete
                  id="nav-search"
                  value={searchValue}
                  onChange={setSearchValue}
                  onSubmit={submitSearch}
                  onSafety={setSafetyWarnings}
                  placeholder="Search products, brands, or categories…"
                  ariaLabel="Search products"
                />
                <button type="submit" className="btn-primary px-4">
                  Search
                </button>
              </form>
              <div className="mt-3">
                <SafetyBanner warnings={safetyWarnings} />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl border border-gray-200/60 bg-white/95 backdrop-blur shadow-2xl"
        >
          <div className="px-3 pt-3 pb-14 space-y-1 max-h-[60vh] overflow-y-auto">
            {user ? (
              <>
                {userIsAdmin ? (
                  <>
                    <Link
                      href="/owner"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/owner/products"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Products
                    </Link>
                    <Link
                      href="/owner/orders"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Orders
                    </Link>
                    <Link
                      href="/owner/refills"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Refills
                    </Link>
                    {userIsSuperAdmin && (
                      <Link
                        href="/owner/employees"
                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Employees
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/products"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Products
                    </Link>
                    <Link
                      href="/refill"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Refill
                    </Link>
                    <Link
                      href="/orders"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </>
                )}
                {!userIsAdmin && (
                  <Link
                    href="/cart"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Cart {cartCount > 0 && `(${cartCount})`}
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    handleSignOut()
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-700 focus:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="block px-3 py-2 rounded-md text-base font-medium text-primary-700 hover:text-primary-800 focus:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/60 bg-white/95 backdrop-blur shadow-sm"
        aria-label="Mobile navigation"
      >
        {userIsAdmin ? (
          /* Admin bottom nav */
          <div className="grid grid-cols-5 py-1">
            <Link
              href="/owner"
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                pathname === '/owner' ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label="Dashboard"
              aria-current={pathname === '/owner' ? 'page' : undefined}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/owner/orders"
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                isActivePath('/owner/orders') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label="Orders"
              aria-current={isActivePath('/owner/orders') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10l8 4 8-4V7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v10" />
              </svg>
              Orders
            </Link>
            <Link
              href="/owner/refills"
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                isActivePath('/owner/refills') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label="Refills"
              aria-current={isActivePath('/owner/refills') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4 6h16M4 10h4M4 14h4M4 18h4" />
              </svg>
              Refills
            </Link>
            <Link
              href="/owner/products"
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                isActivePath('/owner/products') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label="Products"
              aria-current={isActivePath('/owner/products') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l-1 13H7L6 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              Products
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors text-gray-600 hover:text-red-600"
              aria-label="Sign out"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        ) : (
          /* Customer bottom nav */
          <div className="grid grid-cols-5 py-1">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                isMenuOpen ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="dialog"
              aria-controls="mobile-menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Menu
            </button>
            <Link
              href="/"
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                isActivePath('/') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label="Home"
              aria-current={isActivePath('/') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
              </svg>
              Home
            </Link>
            <Link
              href="/products"
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                isActivePath('/products') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label="Products"
              aria-current={isActivePath('/products') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l-1 13H7L6 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              Shop
            </Link>
            <Link
              href="/cart"
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                isActivePath('/cart') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
              aria-label={`Cart with ${cartCount} items`}
              aria-current={isActivePath('/cart') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h2l2.5 10.5h9.5L19 9H7.5" />
                <circle cx="9" cy="19" r="1.5" />
                <circle cx="17" cy="19" r="1.5" />
              </svg>
              Cart
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-5 bg-primary-600 text-white text-[10px] rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1" aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <Link
                href="/orders"
                className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                  isActivePath('/orders') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
                }`}
                aria-label="My orders"
                aria-current={isActivePath('/orders') ? 'page' : undefined}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10l8 4 8-4V7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v10" />
                </svg>
                Orders
              </Link>
            ) : (
              <Link
                href="/login"
                className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors ${
                  isActivePath('/login') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
                }`}
                aria-label="Log in"
                aria-current={isActivePath('/login') ? 'page' : undefined}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 20a8 8 0 0 1 16 0" />
                </svg>
                Log in
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
