import { afterEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/search/route'

function makeRequest(query: string) {
  return new Request(`http://localhost/api/search?${query}`)
}

const originalEnv = { ...process.env }

describe('GET /api/search', () => {
  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    })
    Object.assign(process.env, originalEnv)
  })

  it('validates empty and short queries', async () => {
    const empty = await GET(makeRequest('q='))
    expect(empty.status).toBe(400)

    const short = await GET(makeRequest('q=a'))
    expect(short.status).toBe(400)
  })

  it('validates long queries and invalid params', async () => {
    const longQuery = 'a'.repeat(81)
    const long = await GET(makeRequest(`q=${longQuery}`))
    expect(long.status).toBe(400)

    const invalidLimit = await GET(makeRequest('q=tylenol&limit=999'))
    expect(invalidLimit.status).toBe(400)
  })

  it('returns stable response shape', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=tylenol&limit=5'))
    const data = await res.json()
    expect(Array.isArray(data.items)).toBe(true)
    expect(Array.isArray(data.suggestions)).toBe(true)
    expect(data.meta).toMatchObject({
      page: 1,
      limit: 5
    })
  })

  it('paginates consistently', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const page1 = await GET(makeRequest('q=tylenol&limit=1&page=1'))
    const data1 = await page1.json()
    const page2 = await GET(makeRequest('q=tylenol&limit=1&page=2'))
    const data2 = await page2.json()
    expect(data1.items[0]?.id).not.toBe(data2.items[0]?.id)
  })

  it('ranks brand matches above description-only matches', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=tylenol&limit=5'))
    const data = await res.json()
    expect(data.items[0].brand).toBe('Tylenol')
  })

  it('demotes out-of-stock items', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=pain&limit=5'))
    const data = await res.json()
    const firstOutOfStockIndex = data.items.findIndex((item: any) => item.in_stock === false)
    expect(firstOutOfStockIndex).toBeGreaterThan(-1)
    expect(firstOutOfStockIndex).toBeGreaterThan(0)
  })

  it('returns synonyms and symptoms', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=tylenol&limit=10'))
    const data = await res.json()
    const ids = data.items.map((item: any) => item.id)
    expect(ids).toContain('acetaminophen-500')

    const symptomRes = await GET(makeRequest('q=headache&limit=5'))
    const symptomData = await symptomRes.json()
    const hasSymptomSuggestion = symptomData.suggestions.some(
      (suggestion: any) => suggestion.type === 'symptom'
    )
    expect(hasSymptomSuggestion).toBe(true)
  })

  it('handles typos (asprin -> aspirin)', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=asprin&limit=5'))
    const data = await res.json()
    const ids = data.items.map((item: any) => item.id)
    expect(ids).toContain('bayer-aspirin-325')
  })

  it('keeps variants adjacent and ordered', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=tylenol&limit=10'))
    const data = await res.json()
    const tylenolVariants = data.items.filter((item: any) => item.base_product_name === 'Tylenol Extra Strength')
    expect(tylenolVariants.length).toBeGreaterThan(1)
    expect(tylenolVariants[0].variant_size).toBe('50 ct')
    expect(tylenolVariants[1].variant_size).toBe('100 ct')
  })

  it('falls back when Meilisearch is unavailable', async () => {
    process.env.SEARCH_DATA_SOURCE = 'meili'
    process.env.SEARCH_FALLBACK_SOURCE = 'fixture'
    process.env.MEILISEARCH_URL = 'http://localhost:7700'
    process.env.MEILISEARCH_FORCE_FAIL = 'true'

    const res = await GET(makeRequest('q=tylenol&limit=5'))
    const data = await res.json()
    expect(data.meta.source).toContain('fixture-fallback')
    expect(data.items.length).toBeGreaterThan(0)
  })

  it('does not expose internal cost fields', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=tylenol&limit=5'))
    const data = await res.json()
    const hasInternalCost = data.items.some((item: any) => 'internal_cost_cents' in item)
    expect(hasInternalCost).toBe(false)
  })

  it('meets local performance budget', async () => {
    process.env.SEARCH_DATA_SOURCE = 'fixture'
    const res = await GET(makeRequest('q=tylenol&limit=5'))
    const data = await res.json()
    expect(data.meta.tookMs).toBeLessThan(500)
  })
})
