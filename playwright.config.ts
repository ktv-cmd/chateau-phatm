import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      SEARCH_DATA_SOURCE: 'meili',
      SEARCH_FALLBACK_SOURCE: 'fixture',
      SEARCH_FIXTURE_MODE: 'true',
      MEILISEARCH_FORCE_FAIL: 'true',
      MEILISEARCH_URL: 'http://localhost:7700'
    }
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
})
