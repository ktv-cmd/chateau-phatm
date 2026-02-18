import { afterEach, describe, expect, it } from 'vitest'
import { searchProducts } from '@/lib/search/search'

describe('safety warnings', () => {
  const originalSource = process.env.SEARCH_DATA_SOURCE
  const originalFallback = process.env.SEARCH_FALLBACK_SOURCE

  afterEach(() => {
    process.env.SEARCH_DATA_SOURCE = originalSource
    process.env.SEARCH_FALLBACK_SOURCE = originalFallback
  })

  it('flags pediatric dosage mismatch', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const result = await searchProducts('kids tylenol 500mg')
    expect(result.safety?.warnings[0]?.code).toBe('pediatric-dosage-exceeded')
  })

  it('flags infant ibuprofen warning', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const result = await searchProducts('infant ibuprofen')
    expect(result.safety?.warnings[0]?.code).toBe('age-ingredient-restriction')
  })

  it('does not warn for adult acetaminophen', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const result = await searchProducts('adult acetaminophen 500mg')
    expect(result.safety?.warnings.length).toBe(0)
  })
})
