import { test, expect } from '@playwright/test'
import { login } from './utils'

const customerEmail = process.env.E2E_CUSTOMER_EMAIL
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD

test.describe('customer flow', () => {
  test.skip(!customerEmail || !customerPassword, 'Missing customer credentials')

  test('browse products, add to cart, checkout, orders', async ({ page }) => {
    await login(page, {
      email: customerEmail!,
      password: customerPassword!,
      path: '/login',
      expectedRedirect: /\/products/
    })

    const nav = page.getByRole('navigation', { name: /main navigation/i })
    await expect(nav.getByRole('button', { name: /sign out/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /log in/i })).toHaveCount(0)

    await expect(page.getByRole('heading', { name: /shop/i })).toBeVisible()
    await page.getByLabel(/search products/i).fill('relief')
    await page.getByRole('button', { name: /search/i }).click()

    const firstCard = page.locator('article').first()
    await expect(firstCard).toBeVisible()
    await firstCard.getByRole('button', { name: /add/i }).click()

    await page.getByRole('link', { name: /cart/i }).click()
    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible()

    await page.getByRole('link', { name: /proceed to checkout/i }).click()
    await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible()

    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible()
  })

  test('customer cannot access owner area', async ({ page }) => {
    await login(page, {
      email: customerEmail!,
      password: customerPassword!,
      path: '/login',
      expectedRedirect: /\/products/
    })

    await page.goto('/owner/products')
    await expect(page).toHaveURL(/\/products/)
  })
})
