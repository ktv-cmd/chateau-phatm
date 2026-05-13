import { test, expect } from '@playwright/test'
import { login } from './utils'

const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL
const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD
const customerEmail = process.env.E2E_CUSTOMER_EMAIL
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD

// ---------------------------------------------------------------------------
// Signup form behaviour
// ---------------------------------------------------------------------------

test.describe('signup form', () => {
  test('no name fields shown for non-chateau email', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('Email Address').fill('jane@gmail.com')
    await page.getByLabel('Email Address').blur()
    await expect(page.getByLabel('First Name')).not.toBeVisible()
    await expect(page.getByLabel('Last Name')).not.toBeVisible()
  })

  test('name fields appear when @chateau.com email is typed', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('Email Address').fill('sarah@chateau.com')
    await expect(page.getByLabel('First Name')).toBeVisible()
    await expect(page.getByLabel('Last Name')).toBeVisible()
  })

  test('name fields hide again when switching to non-chateau email', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('Email Address').fill('sarah@chateau.com')
    await expect(page.getByLabel('First Name')).toBeVisible()
    await page.getByLabel('Email Address').fill('sarah@gmail.com')
    await expect(page.getByLabel('First Name')).not.toBeVisible()
  })

  test('submit blocked when name fields are empty for @chateau.com email', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('Email Address').fill('newstaff@chateau.com')
    // Use the specific id to avoid ambiguity with confirm-password input
    await page.locator('#password').fill('TestPass123!')
    // Leave first and last name empty, submit
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByRole('alert').first()).toContainText(/first name/i)
  })
})

// ---------------------------------------------------------------------------
// Employee login & access
// ---------------------------------------------------------------------------

async function changeOrderStatus(page: any, targetStatus: string) {
  const statusSelect = page.locator('#status-select')
  const currentStatus = await statusSelect.inputValue()
  // Only update if status is different (button is disabled when same)
  if (currentStatus === targetStatus) {
    const alternatives = ['NEW', 'CONFIRMED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED']
    const next = alternatives.find(s => s !== currentStatus) || 'CONFIRMED'
    await statusSelect.selectOption(next)
  } else {
    await statusSelect.selectOption(targetStatus)
  }
  await page.getByRole('button', { name: /update order status/i }).click()
}

test.describe('employee flow', () => {
  test.skip(!employeeEmail || !employeePassword, 'Missing employee credentials — run tests/scripts/create-test-accounts.mjs first')

  test('employee login redirects to /owner', async ({ page }) => {
    await login(page, {
      email: employeeEmail!,
      password: employeePassword!,
      path: '/login',
      expectedRedirect: /\/owner/,
    })
  })

  test('employee updating order status shows their name in "last updated by"', async ({ page }) => {
    await login(page, {
      email: employeeEmail!,
      password: employeePassword!,
      path: '/login',
      expectedRedirect: /\/owner/,
    })

    await page.goto('/owner/orders')
    const firstView = page.getByRole('link', { name: /^view order/i }).first()
    await expect(firstView).toBeVisible()
    await firstView.click()

    await changeOrderStatus(page, 'CONFIRMED')

    const updatedByLine = page.getByText(/last updated by/i)
    await expect(updatedByLine).toBeVisible()
    await expect(updatedByLine).toContainText(/test employee/i)
  })

  test('employee can expand status history section', async ({ page }) => {
    await login(page, {
      email: employeeEmail!,
      password: employeePassword!,
      path: '/login',
      expectedRedirect: /\/owner/,
    })

    await page.goto('/owner/orders')
    const firstView = page.getByRole('link', { name: /^view order/i }).first()
    await expect(firstView).toBeVisible()
    await firstView.click()

    // Do a status change to ensure there is at least one history entry
    await changeOrderStatus(page, 'CONFIRMED')
    await expect(page.getByText(/last updated by/i)).toBeVisible()

    // Navigate away and back to get a fresh server-rendered page with statusHistory loaded
    const orderUrl = page.url()
    await page.goto('/owner/orders')
    await page.goto(orderUrl)

    // Status History section button should now be visible (history exists for this order)
    const historyButton = page.getByRole('button', { name: /status history/i })
    await expect(historyButton).toBeVisible({ timeout: 15000 })

    // Click to expand
    await historyButton.click()
    // At least one history entry with the employee name should appear
    await expect(page.getByText(/test employee/i).first()).toBeVisible()
  })

  test('regular employee cannot load /owner/employees (403)', async ({ page }) => {
    await login(page, {
      email: employeeEmail!,
      password: employeePassword!,
      path: '/login',
      expectedRedirect: /\/owner/,
    })

    await page.goto('/owner/employees')
    // Page renders but API returns 403 → error message shown
    await expect(page.getByText(/failed to load employees/i)).toBeVisible()
  })

  test('regular employee gets access denied on /owner/audit', async ({ page }) => {
    await login(page, {
      email: employeeEmail!,
      password: employeePassword!,
      path: '/login',
      expectedRedirect: /\/owner/,
    })

    await page.goto('/owner/audit')
    // Employee can reach the page (not redirected) but cannot load data
    await expect(page).toHaveURL(/\/owner\/audit/)
    // The error state renders — either 'Forbidden' or a load failure message
    await expect(page.getByRole('alert').first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Customer regression
// ---------------------------------------------------------------------------

test.describe('customer regression', () => {
  test.skip(!customerEmail || !customerPassword, 'Missing customer credentials')

  test('customer login redirects to /products', async ({ page }) => {
    await login(page, {
      email: customerEmail!,
      password: customerPassword!,
      path: '/login',
      expectedRedirect: /\/products/,
    })
  })

  test('customer cannot access /owner (redirected to /products)', async ({ page }) => {
    await login(page, {
      email: customerEmail!,
      password: customerPassword!,
      path: '/login',
      expectedRedirect: /\/products/,
    })

    await page.goto('/owner')
    await expect(page).toHaveURL(/\/products/)
  })
})
