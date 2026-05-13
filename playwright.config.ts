import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'

config({ path: '.env.local' })

const TEST_PORT = process.env.E2E_PORT || '3001'
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${TEST_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  expect: { timeout: 10_000 },
  webServer: {
    command: `npm run dev -- --port ${TEST_PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    env: {
      MEILISEARCH_FORCE_FAIL: 'true',
      MEILISEARCH_URL: 'http://localhost:7700'
    }
  },
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
})
