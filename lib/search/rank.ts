import { SearchResultItem } from '@/lib/search/types'
import { normalizeQuery } from '@/lib/search/normalizeQuery'
import { parseQuery, QuerySignals } from '@/lib/search/parseQuery'
import { expandSynonyms } from '@/lib/search/synonyms'

interface MatchSignals {
  exactNameMatch: boolean
  brandMatch: boolean
  ingredientMatch: boolean
  synonymMatch: boolean
  symptomMatch: boolean
  categoryMatch: boolean
  descriptionMatch: boolean
}

function computeMatchSignals(
  product: SearchResultItem,
  query: string,
  signals: QuerySignals
): MatchSignals {
  const normalizedQuery = normalizeQuery(query)
  const name = normalizeQuery(product.name || '')
  const brand = normalizeQuery(product.brand || '')
  const category = normalizeQuery(product.category || '')
  const description = normalizeQuery(product.description || '')
  const synonyms = expandSynonyms(normalizedQuery)

  const ingredientMatch = (product.active_ingredients || []).some((ingredient) =>
    signals.detectedIngredients.includes(normalizeQuery(ingredient))
  )

  const synonymMatch = synonyms.some((term) => name.includes(term) || brand.includes(term))

  const symptomMatch = (product.symptom_tags || []).some((symptom) =>
    signals.detectedSymptoms.includes(normalizeQuery(symptom))
  )

  const tokenMatchesDescription = signals.tokens.some((token) => description.includes(token))

  return {
    exactNameMatch: !!normalizedQuery && name === normalizedQuery,
    brandMatch: signals.tokens.some((token) => brand.includes(token)),
    ingredientMatch,
    synonymMatch,
    symptomMatch,
    categoryMatch: signals.tokens.some((token) => category.includes(token)),
    descriptionMatch: tokenMatchesDescription
  }
}

export function scoreProduct(product: SearchResultItem, query: string, signals?: QuerySignals): number {
  const querySignals = signals || parseQuery(query)
  const matches = computeMatchSignals(product, query, querySignals)

  let score = 0
  score += matches.exactNameMatch ? 6.0 : 0
  score += matches.brandMatch ? 5.0 : 0
  score += matches.ingredientMatch ? 4.5 : 0
  score += matches.synonymMatch ? 4.0 : 0
  score += matches.symptomMatch ? 3.0 : 0
  score += matches.categoryMatch ? 2.0 : 0
  score += matches.descriptionMatch ? 1.5 : 0

  const popularity = product.popularity_score || 0
  score += Math.min(popularity / 100, 1)

  const ratingBoost = product.rating_avg ? 1 + Math.min(product.rating_avg / 10, 0.5) : 1
  const marginBoost = product.margin_bucket === 'A' ? 1.05 : 1
  const stockBoost = product.in_stock ? 1.2 : 0.2

  score *= ratingBoost
  score *= marginBoost
  score *= stockBoost

  if (querySignals.ageIntent && product.age_group && product.age_group !== querySignals.ageIntent) {
    score *= 0.1
  }

  return Number(score.toFixed(4))
}

function sortVariantsWithinGroups(items: SearchResultItem[]): SearchResultItem[] {
  const groups = new Map<string, SearchResultItem[]>()
  items.forEach((item) => {
    const key = item.base_product_name || item.name
    const group = groups.get(key) || []
    group.push(item)
    groups.set(key, group)
  })

  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const aScore = Math.max(...a[1].map((item) => item.score || 0))
    const bScore = Math.max(...b[1].map((item) => item.score || 0))
    return bScore - aScore
  })

  return sortedGroups.flatMap(([, group]) =>
    group.sort((a, b) => {
      const aSize = a.variant_size || ''
      const bSize = b.variant_size || ''
      const aNum = parseFloat(aSize)
      const bNum = parseFloat(bSize)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum
      }
      return aSize.localeCompare(bSize)
    })
  )
}

export function rankProducts(items: SearchResultItem[], query: string, signals?: QuerySignals): SearchResultItem[] {
  const querySignals = signals || parseQuery(query)
  const scored = items.map((item) => ({
    ...item,
    score: scoreProduct(item, query, querySignals)
  }))
  const sorted = scored.sort((a, b) => (b.score || 0) - (a.score || 0))
  return sortVariantsWithinGroups(sorted)
}
