import { test, expect } from '@playwright/test'
import { login } from './utils'

const ownerEmail = process.env.E2E_OWNER_EMAIL
const ownerPassword = process.env.E2E_OWNER_PASSWORD

test.describe('owner flow', () => {
  test.skip(!ownerEmail || !ownerPassword, 'Missing owner credentials')

  test('owner can access products and edit product', async ({ page }) => {
    await login(page, {
      email: ownerEmail!,
      password: ownerPassword!,
      path: '/login',
      expectedRedirect: /\/owner/
    })

    await page.goto('/owner/products')
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible()
    await expect(page.getByRole('table', { name: /products table/i })).toBeVisible()

    const firstEdit = page.getByRole('button', { name: /^edit/i }).first()
    await firstEdit.click()

    await expect(page.getByRole('heading', { name: /edit product/i })).toBeVisible()
    await expect(page.getByText(/product images/i)).toBeVisible()
  })

  test('unauthenticated user cannot access owner area', async ({ page }) => {
    await page.goto('/owner/products')
    await expect(page).toHaveURL(/\/login/)
  })

  test('order detail shows Item ID values', async ({ page }) => {
    await login(page, {
      email: ownerEmail!,
      password: ownerPassword!,
      path: '/login',
      expectedRedirect: /\/owner/
    })

    await page.goto('/owner/orders')
    await expect(page.getByRole('heading', { name: /^orders$/i })).toBeVisible()

    const firstViewButton = page.getByRole('link', { name: /^view order/i }).first()
    await expect(firstViewButton).toBeVisible()
    await firstViewButton.click()

    await expect(page.getByRole('heading', { name: /order items/i })).toBeVisible()
    const table = page.getByRole('table', { name: /order items/i })
    await expect(table.getByRole('columnheader', { name: /item id/i })).toBeVisible()

    const itemIdCells = table.locator('tbody tr td:nth-child(2)')
    await expect(itemIdCells.first()).toBeVisible()

    const nonDashCount = await itemIdCells
      .filter({ hasNotText: /^-$/ })
      .count()
    expect(nonDashCount).toBeGreaterThan(0)
  })
})
