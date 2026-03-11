// Mock for Next.js `next/headers` — provides stub cookies() for test environment
import { vi } from 'vitest'

export const cookies = vi.fn(() => ({
  get: vi.fn(() => undefined),
  getAll: vi.fn(() => []),
  set: vi.fn(),
  delete: vi.fn(),
}))
