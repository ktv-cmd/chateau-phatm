import { expect, Page } from '@playwright/test'

export async function login(
  page: Page,
  {
    email,
    password,
    path = '/login',
    expectedRedirect
  }: {
    email: string
    password: string
    path?: string
    expectedRedirect?: RegExp
  }
) {
  await page.goto(path)
  await page.getByLabel('Email Address').fill(email)
  // Use role+name to target only the password input, not the "Show password" button
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: /(sign in|log in)/i }).click()
  if (expectedRedirect) {
    await expect(page).toHaveURL(expectedRedirect)
  }
}
