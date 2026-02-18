import { searchMeili, MeilisearchUnavailableError } from '@/lib/search/meilisearchClient'
import { parseQuery } from '@/lib/search/parseQuery'
import { rankProducts } from '@/lib/search/rank'
import { fixtureProducts } from '@/lib/search/fixtures'
import { SearchFilters, SearchOptions, SearchResponse, SearchResultItem, SearchSuggestion, SearchSafety, SearchSafetyWarning } from '@/lib/search/types'
import { normalizeQuery } from '@/lib/search/normalizeQuery'
import { SYMPTOM_MAP, expandSynonyms } from '@/lib/search/synonyms'
import { SAFETY_RULES } from '@/lib/search/safetyRules'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listProducts } from '@/lib/db/products'

function sanitizeProduct(item: SearchResultItem): SearchResultItem {
  const { internal_cost_cents, ...safe } = item as SearchResultItem & { internal_cost_cents?: number }
  return safe
}

function filterByQuery(items: SearchResultItem[], query: string): SearchResultItem[] {
  if (!query.trim()) return items
  const normalized = normalizeQuery(query)
  const expanded = expandSynonyms(normalized)
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.brand,
      item.category,
      item.description,
      item.variant_size,
      ...(item.active_ingredients || []),
      ...(item.symptom_tags || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (haystack.includes(normalized)) return true
    if (expanded.some((term) => haystack.includes(term))) return true
    const queryTokens = normalized.split(' ').filter(Boolean)
    return queryTokens.some((token) => fuzzyIncludes(haystack, token))
  })
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  const words = haystack.split(' ').filter(Boolean)
  return words.some((word) => levenshtein(word, needle) <= 2)
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => [])
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[a.length][b.length]
}

function filterByFilters(items: SearchResultItem[], filters: SearchFilters): SearchResultItem[] {
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false
    if (filters.inStockOnly && !item.in_stock) return false
    if (filters.ageGroup && item.age_group && item.age_group !== filters.ageGroup) return false
    return true
  })
}

function buildSuggestions(items: SearchResultItem[], query: string): SearchSuggestion[] {
  const normalized = normalizeQuery(query)
  const suggestions: SearchSuggestion[] = []
  const categories = new Set<string>()
  const symptoms = new Set<string>()

  items.slice(0, 5).forEach((item) => {
    suggestions.push({
      type: 'product',
      value: item.name,
      productId: item.id,
      image_url: item.image_url || null,
      subtitle: [item.brand, item.variant_size].filter(Boolean).join(' • ')
    })
    if (item.category) categories.add(item.category)
  })

  Object.keys(SYMPTOM_MAP).forEach((symptom) => {
    if (normalized.includes(symptom)) {
      symptoms.add(symptom)
    }
  })

  Array.from(categories)
    .slice(0, 3)
    .forEach((category) =>
      suggestions.push({
        type: 'category',
        value: category
      })
    )

  Array.from(symptoms)
    .slice(0, 3)
    .forEach((symptom) =>
      suggestions.push({
        type: 'symptom',
        value: symptom
      })
    )

  if (normalized) {
    suggestions.push({ type: 'query', value: normalized })
  }

  return suggestions
}

function buildSafety(signals: ReturnType<typeof parseQuery>): SearchSafety {
  const warnings = SAFETY_RULES.flatMap((rule): SearchSafetyWarning[] => {
    if (!signals.ageIntent || rule.age_group !== signals.ageIntent) return []
    if (!signals.detectedIngredients.includes(rule.ingredient)) return []

    if (rule.disallow) {
      return [
        {
          code: 'age-ingredient-restriction',
          message: rule.warning_text,
          severity: 'critical' as const,
          field: 'age' as const
        }
      ]
    }

    if (rule.max_dosage_mg && signals.dosage?.value) {
      if (signals.dosage.value > rule.max_dosage_mg) {
        return [
          {
            code: 'pediatric-dosage-exceeded',
            message: rule.warning_text,
            severity: 'warning' as const,
            field: 'dosage' as const
          }
        ]
      }
    }

    return []
  })

  return { warnings }
}

async function searchFixtures(query: string, filters: SearchFilters): Promise<SearchResultItem[]> {
  const filtered = filterByFilters(filterByQuery(fixtureProducts, query), filters)
  return filtered.map((item) => sanitizeProduct(item))
}

async function searchPostgres(query: string, filters: SearchFilters): Promise<SearchResultItem[]> {
  const serverSupabase = await supabaseServerClient()
  const { data } = await listProducts(serverSupabase, {
    category: filters.category,
    search: query,
    active: 'active'
  })
  return (data || []).map((item) => sanitizeProduct(item as SearchResultItem))
}

export async function searchProducts(
  query: string,
  filters: SearchFilters = {},
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const start = Date.now()
  const normalized = normalizeQuery(query)
  const signals = parseQuery(query)
  const primarySource = process.env.SEARCH_DATA_SOURCE || 'meili'
  const fallbackSource = process.env.SEARCH_FALLBACK_SOURCE || 'postgres'

  let items: SearchResultItem[] = []
  let source = primarySource

  if (primarySource === 'fixture') {
    items = await searchFixtures(normalized, filters)
  } else if (primarySource === 'postgres') {
    items = await searchPostgres(normalized, filters)
  } else {
    try {
      items = await searchMeili(normalized, filters, options)
    } catch (error) {
      if (error instanceof MeilisearchUnavailableError) {
        source = `${fallbackSource}-fallback`
        items =
          fallbackSource === 'fixture'
            ? await searchFixtures(normalized, filters)
            : await searchPostgres(normalized, filters)
      } else {
        throw error
      }
    }
  }

  const ranked = rankProducts(items, normalized, signals)
  const total = ranked.length
  const page = options.page || 1
  const limit = options.limit || 20
  const startIndex = (page - 1) * limit
  const pageItems = ranked.slice(startIndex, startIndex + limit)

  const suggestions = options.includeSuggestions !== false ? buildSuggestions(ranked, normalized) : []
  const safety = buildSafety(signals)

  return {
    items: pageItems,
    suggestions,
    safety,
    meta: {
      page,
      limit,
      total,
      tookMs: Date.now() - start,
      source,
      query: normalized
    },
    debug: options.includeDebug ? { signals } : undefined
  }
}
