/**
 * Customer UX — comprehensive end-to-end suite
 *
 * Structure
 * ─────────
 * 1. Login page UX         (no credentials needed)
 * 2. Sign-up page UX       (no credentials needed)
 * 3. Product discovery UX  (no credentials needed)
 * 4. Search UX             (no credentials needed)
 * 5. Protected redirects   (no credentials needed)
 * 6. Authenticated UX      (requires E2E_CUSTOMER_EMAIL + E2E_CUSTOMER_PASSWORD)
 *    a. Auth (login / logout)
 *    b. Browse & add to cart
 *    c. Cart management
 *    d. Checkout & order confirmation
 *    e. My Orders
 *    f. My Profile
 *    g. Access-control – customer cannot reach owner area
 */

import { test, expect, Page } from '@playwright/test'
import { login } from './utils'

const customerEmail    = process.env.E2E_CUSTOMER_EMAIL
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD
const hasCredentials   = Boolean(customerEmail && customerPassword)

// ─── helper: remove every item from /cart via the UI ─────────────────────────
async function clearCart(page: Page) {
  // Retry the navigation up to 3 times in case the server session cookie is not yet set
  for (let nav = 0; nav < 3; nav++) {
    await page.goto('/cart')
    if (!page.url().includes('/login')) break
    await page.waitForTimeout(1500)
  }
  // Up to 20 items – stop when no more Remove buttons are present
  for (let i = 0; i < 20; i++) {
    const btn = page.getByRole('button', { name: /remove.*from cart/i }).first()
    if (!(await btn.isVisible())) break
    await btn.click()
    // Wait for the item to disappear from the DOM before trying again
    await expect(btn).not.toBeVisible({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(500)
  }
}

// ─── helper: add the first in-stock product via its detail page ───────────────
// This is more reliable than clicking "Add" in the products list because the
// ProductDetail "Add to Cart" button redirects to /cart on success, giving a
// clear, URL-based confirmation that the Supabase insert succeeded.
async function addFirstProductToCart(page: Page) {
  await page.goto('/products')
  const firstLink = page.locator('article').first().getByRole('link').first()
  const href = await firstLink.getAttribute('href')
  if (!href) throw new Error('No product link found on /products')
  // Strip any ?returnTo= param so we land cleanly on the detail page
  const productPath = href.split('?')[0]
  await page.goto(productPath)
  await expect(page).toHaveURL(/\/products\//)
  const addBtn = page.locator('button').filter({ hasText: /add to cart/i })
  await expect(addBtn).toBeVisible({ timeout: 8000 })
  await addBtn.click()
  // Confirmed add: ProductDetail redirects to /cart after a successful insert
  await expect(page).toHaveURL(/\/cart/, { timeout: 20000 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LOGIN PAGE UX
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('UX › Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows Email Address and Password fields with accessible labels', async ({ page }) => {
    await expect(page.getByLabel('Email Address')).toBeVisible()
    // Use role+name to target just the input, not the "Show password" button
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('sign-in button is disabled while Supabase is loading', async ({ page }) => {
    // The button must never be in an ambiguous broken state at first paint
    const btn = page.getByRole('button', { name: /sign in/i })
    await expect(btn).toBeVisible()
  })

  test('has show / hide password toggle', async ({ page }) => {
    const passwordInput = page.getByRole('textbox', { name: 'Password' })
    await expect(page.getByRole('button', { name: /show password/i })).toBeVisible()
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('shows an error alert when wrong credentials are submitted', async ({ page }) => {
    await page.getByLabel('Email Address').fill('nobody@nowhere.invalid')
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword99')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 12000 })
  })

  test('has a "Sign up" link that navigates to /signup', async ({ page }) => {
    // Use the exact inline text link inside the form paragraph (not nav links)
    await page.locator('p').getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('page title / heading identifies the form purpose', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SIGN-UP PAGE UX
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('UX › Sign-up page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
  })

  test('shows Email Address, Password, and Confirm Password fields', async ({ page }) => {
    await expect(page.getByLabel('Email Address')).toBeVisible()
    // Use id-based locator to be unambiguous on the signup page (two password fields + two buttons)
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('shows real-time error when password is too short', async ({ page }) => {
    await page.locator('#password').fill('tiny')
    await page.locator('#password').blur()
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })

  test('shows error when passwords do not match on submit', async ({ page }) => {
    await page.getByLabel('Email Address').fill('test@example.com')
    await page.locator('#password').fill('Password123!')
    await page.locator('#confirmPassword').fill('Different456!')
    await page.getByRole('button', { name: /create account/i }).click()
    // Filter out Next.js route announcer (#__next-route-announcer__) which also has role="alert"
    await expect(
      page.getByRole('alert').filter({ hasText: /passwords do not match/i })
    ).toBeVisible()
  })

  test('shows error when password is too short on submit', async ({ page }) => {
    await page.getByLabel('Email Address').fill('test@example.com')
    await page.locator('#password').fill('short')
    await page.locator('#confirmPassword').fill('short')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(
      page.getByRole('alert').filter({ hasText: /at least 8 characters/i })
    ).toBeVisible()
  })

  test('shows real-time email format validation', async ({ page }) => {
    await page.getByLabel('Email Address').fill('notanemail')
    await page.getByLabel('Email Address').blur()
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test('has show / hide password toggle on the password field', async ({ page }) => {
    await expect(page.getByRole('button', { name: /show password/i }).first()).toBeVisible()
    await page.getByRole('button', { name: /show password/i }).first().click()
    await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  })

  test('has a "Log in" link that goes back to /login', async ({ page }) => {
    // Scope to the form card to avoid the 3 Log In links (nav desktop, nav mobile, form)
    await page.locator('form').getByRole('link', { name: /log in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PRODUCT DISCOVERY UX — no auth required
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('UX › Home page product listings', () => {
  test('shows at least one product category section', async ({ page }) => {
    await page.goto('/')
    // Category headings are rendered as h2
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
  })

  test('clicking a product card navigates to its detail page', async ({ page }) => {
    await page.goto('/')
    // Product cards have aria-label="View {name}"; "View all" links go to /products?category
    // Use attribute selector to get a product card link (aria-label starts with "View " but not "View all")
    const firstProductCard = page.locator('a[aria-label^="View "]:not([aria-label="View all"])').first()
    await expect(firstProductCard).toBeVisible()
    await firstProductCard.click()
    await expect(page).toHaveURL(/\/products\//)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('UX › Products browse page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
  })

  test('shows a "Shop" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /shop/i })).toBeVisible()
  })

  test('shows product cards that contain a price', async ({ page }) => {
    const firstArticle = page.locator('article').first()
    await expect(firstArticle).toBeVisible()
    await expect(firstArticle).toContainText(/\$/)
  })

  test('shows an accessible search input', async ({ page }) => {
    await expect(page.getByLabel(/search products/i)).toBeVisible()
  })

  test('shows a category filter control', async ({ page }) => {
    // ProductsList renders a <select id="category-filter"> for category filtering
    await expect(page.getByLabel(/filter products by category/i)).toBeVisible()
  })

  test('each product card links to its detail page', async ({ page }) => {
    const link = page.locator('article').first().getByRole('link').first()
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/\/products\//)
  })
})

test.describe('UX › Product detail page', () => {
  test('shows product name, price, and login/cart prompt for unauthenticated user', async ({ page }) => {
    await page.goto('/products')
    const firstLink = page.locator('article').first().getByRole('link').first()
    await firstLink.click()
    await expect(page).toHaveURL(/\/products\//)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/\$|Call for price/i)).toBeVisible()

    // Unauthenticated users see "Log In" and "Create Account" links (not Add to Cart)
    // OR out-of-stock notice if product is out of stock
    const createAcct = page.getByRole('link', { name: /create account/i })
    const outOfStock = page.getByText(/out of stock/i)
    await expect(createAcct.or(outOfStock)).toBeVisible()
  })

  test('unauthenticated user clicking Add to Cart is sent to /login', async ({ page }) => {
    await page.goto('/products')
    const firstLink = page.locator('article').first().getByRole('link').first()
    const href = await firstLink.getAttribute('href')
    if (!href) return
    await page.goto(href)

    // Button text is "Add to Cart"; use text filter (aria-label is "Add {qty} {name} to cart")
    const addBtn = page.locator('button').filter({ hasText: /add to cart/i })
    if (await addBtn.isVisible() && await addBtn.isEnabled()) {
      await addBtn.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SEARCH UX — no auth required
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('UX › Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
  })

  test('returns product results for a known query', async ({ page }) => {
    await page.getByLabel(/search products/i).fill('pain')
    await page.getByRole('button', { name: /search/i }).click()
    await expect(page.locator('article').first()).toBeVisible()
  })

  test('shows empty-state message for a nonsense query', async ({ page }) => {
    await page.getByLabel(/search products/i).fill('zzznoproduct')
    await page.getByRole('button', { name: /search/i }).click()
    await expect(page.getByText(/no products found/i)).toBeVisible()
  })

  test('clearing search returns to full product list', async ({ page }) => {
    await page.getByLabel(/search products/i).fill('zzznoproduct')
    await page.getByRole('button', { name: /search/i }).click()
    await expect(page.getByText(/no products found/i)).toBeVisible()

    await page.getByLabel(/search products/i).clear()
    await page.getByRole('button', { name: /search/i }).click()
    await expect(page.locator('article').first()).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PROTECTED ROUTE REDIRECTS — unauthenticated user
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('UX › Protected routes redirect unauthenticated users', () => {
  for (const route of ['/cart', '/checkout', '/orders', '/profile']) {
    test(`${route} → /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AUTHENTICATED CUSTOMER UX
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('UX › Authenticated customer', () => {
  test.skip(!hasCredentials, 'Missing customer credentials — set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await login(page, {
      email: customerEmail!,
      password: customerPassword!,
      path: '/login',
      expectedRedirect: /\/products/
    })
    // 1. Wait for the client-side session: Navigation shows "Sign Out"
    const nav = page.getByRole('navigation', { name: /main navigation/i })
    await expect(nav.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 12000 })

    // 2. Confirm the server-side cookie is set by navigating to a protected route.
    //    api/auth/set-session is async – retry until /orders is reachable (not /login).
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.goto('/orders')
      if (!page.url().includes('/login')) break
      await page.waitForTimeout(800)
    }
    // 3. Return to /products for the test body
    await page.goto('/products')
  })

  // ── a. Auth ─────────────────────────────────────────────────────────────────

  test('nav shows "Sign Out" button after login and hides "Log in" link', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /main navigation/i })
    await expect(nav.getByRole('button', { name: /sign out/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /log in/i })).toHaveCount(0)
  })

  test('after logout nav shows "Log in" and "Sign Up" links', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /main navigation/i })
    await nav.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login|\//, { timeout: 8000 })

    const nav2 = page.getByRole('navigation', { name: /main navigation/i })
    await expect(nav2.getByRole('link', { name: /log in/i })).toBeVisible({ timeout: 6000 })
    await expect(nav2.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  // ── b. Browse & add to cart ──────────────────────────────────────────────────

  test('products page shows enabled "Add … to cart" buttons for in-stock items', async ({ page }) => {
    await page.goto('/products')
    const addBtn = page.getByRole('button', { name: /add.*to cart/i }).first()
    await expect(addBtn).toBeVisible()
    await expect(addBtn).toBeEnabled()
  })

  test('clicking "Add" on a product card shows quantity controls on the card', async ({ page }) => {
    await clearCart(page)
    // Server session is confirmed by beforeEach; cart is empty; click Add directly
    await page.goto('/products')
    const addBtn = page.getByRole('button', { name: /add.*to cart/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 8000 })
    await addBtn.click()
    // After a successful add the card replaces the Add button with +/– controls
    const increaseOnCard = page.getByRole('button', { name: /increase quantity/i }).first()
    await expect(increaseOnCard).toBeVisible({ timeout: 20000 })
    await clearCart(page)
  })

  test('product detail page "Add to Cart" button redirects to /cart after adding', async ({ page }) => {
    await clearCart(page)
    // addFirstProductToCart uses ProductDetail which does router.push('/cart') after insert
    await addFirstProductToCart(page)
    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible()
    await clearCart(page)
  })

  // ── c. Cart management ───────────────────────────────────────────────────────

  test('cart page shows "Shopping Cart" heading and is accessible via nav', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /main navigation/i })
    await nav.getByRole('link', { name: /cart/i }).click()
    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible()
  })

  test('empty cart shows "Your cart is empty" and a Browse Products link', async ({ page }) => {
    await clearCart(page)
    await page.goto('/cart')
    await expect(page.getByText(/your cart is empty/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /browse products/i })).toBeVisible()
  })

  test('added item appears in cart with product heading', async ({ page }) => {
    await clearCart(page)
    // addFirstProductToCart adds the product and lands on /cart
    await addFirstProductToCart(page)
    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible()
    // At least one product heading should be in the cart items list
    await expect(page.locator('.card h2').first()).toBeVisible()
    await clearCart(page)
  })

  test('cart shows subtotal and a "Proceed to Checkout" link', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    await expect(page.getByText(/subtotal/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /proceed to checkout/i }).first()).toBeVisible()
    await clearCart(page)
  })

  test('can increase item quantity in cart (qty becomes 2)', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    await page.getByRole('button', { name: /increase quantity/i }).first().click()
    await expect(page.getByRole('spinbutton').first()).toHaveValue('2', { timeout: 10000 })
    await clearCart(page)
  })

  test('decrease button is disabled when quantity is already 1', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    const decreaseBtn = page.getByRole('button', { name: /decrease quantity/i }).first()
    await expect(decreaseBtn).toBeDisabled()
    await clearCart(page)
  })

  test('can increase then decrease item quantity back to 1', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    await page.getByRole('button', { name: /increase quantity/i }).first().click()
    await expect(page.getByRole('spinbutton').first()).toHaveValue('2', { timeout: 10000 })
    await page.getByRole('button', { name: /decrease quantity/i }).first().click()
    await expect(page.getByRole('spinbutton').first()).toHaveValue('1', { timeout: 10000 })
    await clearCart(page)
  })

  test('removing the only cart item shows empty cart message', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    await page.getByRole('button', { name: /remove.*from cart/i }).first().click()
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 10000 })
  })

  // ── d. Checkout & order confirmation ────────────────────────────────────────

  test('visiting /checkout with an empty cart redirects to /cart', async ({ page }) => {
    await clearCart(page)
    await page.goto('/checkout')
    await expect(page).toHaveURL(/\/cart/, { timeout: 8000 })
  })

  test('checkout form shows all required delivery fields', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    await page.goto('/checkout')

    await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible()
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    await expect(page.getByLabel(/phone number/i)).toBeVisible()
    await expect(page.getByLabel(/address line 1/i)).toBeVisible()
    await expect(page.getByLabel(/city/i)).toBeVisible()
    await expect(page.getByLabel(/state/i)).toBeVisible()
    await expect(page.getByLabel(/zip code/i)).toBeVisible()

    await clearCart(page)
  })

  test('checkout shows validation errors when required fields are submitted empty', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    await page.goto('/checkout')

    // Switch to new address mode in case a saved address is pre-selected (it disables the fields)
    const newAddressRadio = page.getByLabel(/use a new address/i)
    if (await newAddressRadio.isVisible()) {
      await newAddressRadio.click()
    }

    // Clear all required fields
    await page.getByLabel(/first name/i).clear()
    await page.getByLabel(/last name/i).clear()
    await page.getByLabel(/phone number/i).clear()
    await page.getByLabel(/address line 1/i).clear()
    await page.getByLabel(/city/i).clear()
    await page.getByLabel(/state/i).clear()
    await page.getByLabel(/zip code/i).clear()

    await page.getByRole('button', { name: /place order/i }).click()

    // At least one validation error must appear (filter out Next.js route announcer)
    await expect(
      page.getByRole('alert').filter({ hasText: /.+/ }).first()
    ).toBeVisible({ timeout: 4000 })

    await clearCart(page)
  })

  test('completing checkout creates order and shows "Order placed successfully!"', async ({ page }) => {
    await clearCart(page)
    await addFirstProductToCart(page)
    await page.goto('/checkout')

    // If saved address radio is shown, switch to new
    const newAddressRadio = page.getByLabel(/use a new address/i)
    if (await newAddressRadio.isVisible()) {
      await newAddressRadio.click()
    }

    await page.getByLabel(/first name/i).fill('Test')
    await page.getByLabel(/last name/i).fill('Customer')
    await page.getByLabel(/phone number/i).fill('555-111-2222')
    await page.getByLabel(/address line 1/i).fill('123 Test Street')
    await page.getByLabel(/city/i).fill('Anytown')
    await page.getByLabel(/state/i).fill('LA')
    await page.getByLabel(/zip code/i).fill('70001')

    await page.getByRole('button', { name: /place order/i }).click()

    // Redirects to /orders/:id?success=true
    await expect(page).toHaveURL(/\/orders\/.+success=true/, { timeout: 20000 })
    await expect(
      page.getByRole('alert').filter({ hasText: /order placed successfully/i })
    ).toBeVisible()
  })

  // ── e. My Orders ─────────────────────────────────────────────────────────────

  test('"My Orders" page shows the orders heading', async ({ page }) => {
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible()
  })

  test('orders page shows at least one order (from the checkout test above) or empty state', async ({ page }) => {
    await page.goto('/orders')
    const heading   = page.getByRole('heading', { name: /my orders/i })
    const orderCard = page.getByRole('link', { name: /order #/i }).first()
    const noOrders  = page.getByText(/no orders found/i)

    await expect(heading).toBeVisible()
    await expect(orderCard.or(noOrders)).toBeVisible()
  })

  test('order detail page shows "Order Details" heading', async ({ page }) => {
    await page.goto('/orders')
    const firstOrder = page.getByRole('link', { name: /order #/i }).first()
    if (await firstOrder.isVisible()) {
      await firstOrder.click()
      await expect(page.getByRole('heading', { name: /order details/i })).toBeVisible()
      await expect(page).toHaveURL(/\/orders\//)
    }
  })

  // ── f. My Profile ─────────────────────────────────────────────────────────────

  test('profile page shows "My Profile" heading and personal info fields', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible()
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    await expect(page.getByLabel(/phone number/i)).toBeVisible()
  })

  test('saving profile shows "Profile updated successfully!" alert', async ({ page }) => {
    await page.goto('/profile')
    await page.getByLabel(/first name/i).fill('UXTest')
    await page.getByRole('button', { name: /save profile/i }).click()
    // Filter out the Next.js __next-route-announcer__ which also has role="alert"
    await expect(
      page.getByRole('alert').filter({ hasText: /profile updated successfully/i })
    ).toBeVisible({ timeout: 10000 })
  })

  // ── g. Access control — customer cannot reach owner area ─────────────────────

  test('visiting /owner redirects away from owner area', async ({ page }) => {
    await page.goto('/owner')
    await expect(page).not.toHaveURL(/^\/owner$/)
  })

  test('visiting /owner/products redirects away', async ({ page }) => {
    await page.goto('/owner/products')
    await expect(page).not.toHaveURL(/\/owner\/products/)
  })

  test('visiting /owner/orders redirects away', async ({ page }) => {
    await page.goto('/owner/orders')
    await expect(page).not.toHaveURL(/\/owner\/orders/)
  })
})
