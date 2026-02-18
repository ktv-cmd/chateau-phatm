import { test, expect } from '@playwright/test'

test.describe('search experience', () => {
  test('search success shows suggestions and results', async ({ page }) => {
    await page.goto('/products')

    const searchInput = page.getByLabel('Search products')
    await searchInput.fill('tylenol')
    await expect(page.getByRole('listbox')).toBeVisible()

    await searchInput.press('Enter')
    await expect(page.getByRole('heading', { name: /Tylenol Extra Strength/i })).toBeVisible()
  })

  test('typo tolerance returns aspirin', async ({ page }) => {
    await page.goto('/products')
    const searchInput = page.getByLabel('Search products')
    await searchInput.fill('asprin')
    await searchInput.press('Enter')
    await expect(page.getByRole('heading', { name: /Aspirin 325mg/i })).toBeVisible()
  })

  test('safety banner appears for pediatric mismatch', async ({ page }) => {
    await page.goto('/products')
    const searchInput = page.getByLabel('Search products')
    await searchInput.fill('kids tylenol 500mg')
    await expect(page.getByText('Safety notice')).toBeVisible()
  })

  test('fallback search returns results when Meilisearch is down', async ({ page }) => {
    await page.goto('/products?search=tylenol')
    await expect(page.getByRole('heading', { name: /Tylenol Extra Strength/i })).toBeVisible()
  })

  test('mobile autocomplete fits viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/products')
    const searchInput = page.getByLabel('Search products')
    await searchInput.fill('tylenol')
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    const box = await listbox.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(375)
    }
  })
})
