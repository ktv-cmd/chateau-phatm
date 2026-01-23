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
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  if (expectedRedirect) {
    await expect(page).toHaveURL(expectedRedirect)
  }
}
