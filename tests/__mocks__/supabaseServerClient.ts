// Mock Supabase server client — never called in fixture-mode tests
import { vi } from 'vitest'

export const supabaseServerClient = vi.fn(async () => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}))
