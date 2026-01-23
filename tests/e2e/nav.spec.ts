import { test, expect } from '@playwright/test'

test('logged-out navbar shows only auth links', async ({ page }) => {
  await page.goto('/login')
  const nav = page.getByRole('navigation', { name: /main navigation/i })
  await expect(nav.getByRole('link', { name: /log in/i })).toBeVisible()
  await expect(nav.getByRole('link', { name: /sign up/i })).toBeVisible()
  await expect(nav.getByRole('button', { name: /sign out/i })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: /dashboard/i })).toHaveCount(0)
})
