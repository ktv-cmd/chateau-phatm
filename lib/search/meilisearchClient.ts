import { SearchFilters, SearchOptions, SearchResultItem } from '@/lib/search/types'

export class MeilisearchUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MeilisearchUnavailableError'
  }
}

export async function searchMeili(
  query: string,
  filters: SearchFilters,
  options: SearchOptions
): Promise<SearchResultItem[]> {
  const url = process.env.MEILISEARCH_URL
  if (!url) {
    throw new MeilisearchUnavailableError('MEILISEARCH_URL not configured')
  }
  if (process.env.MEILISEARCH_FORCE_FAIL === 'true') {
    throw new MeilisearchUnavailableError('Meilisearch forced failure for tests')
  }

  const index = process.env.MEILISEARCH_INDEX || 'products_search'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.MEILISEARCH_KEY) {
    headers.Authorization = `Bearer ${process.env.MEILISEARCH_KEY}`
  }

  const filterParts: string[] = []
  if (filters.category) filterParts.push(`category = "${filters.category}"`)
  if (filters.inStockOnly) filterParts.push('in_stock = true')
  if (filters.ageGroup) filterParts.push(`age_group = "${filters.ageGroup}"`)

  const response = await fetch(`${url}/indexes/${index}/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      q: query,
      limit: options.limit || 20,
      offset: ((options.page || 1) - 1) * (options.limit || 20),
      filter: filterParts.length ? filterParts.join(' AND ') : undefined
    })
  })

  if (!response.ok) {
    throw new MeilisearchUnavailableError(`Meilisearch error: ${response.status}`)
  }

  const data = await response.json()
  return (data.hits || []) as SearchResultItem[]
}
