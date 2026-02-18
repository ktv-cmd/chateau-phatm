export type SearchSuggestionType =
  | 'product'
  | 'category'
  | 'symptom'
  | 'query'
  | 'brand'
  | 'ingredient'

export interface SearchSuggestion {
  type: SearchSuggestionType
  value: string
  productId?: string
  image_url?: string | null
  subtitle?: string
}

export type SafetySeverity = 'info' | 'warning' | 'critical'

export interface SearchSafetyWarning {
  code: string
  message: string
  severity: SafetySeverity
  field?: 'age' | 'dosage' | 'ingredient'
}

export interface SearchSafety {
  warnings: SearchSafetyWarning[]
}

export interface SearchResultItem {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  description?: string | null
  image_url?: string | null
  price_display?: string | null
  in_stock: boolean
  base_product_name?: string | null
  variant_size?: string | null
  active_ingredients?: string[] | null
  symptom_tags?: string[] | null
  form?: string | null
  dosage_value?: number | null
  dosage_unit?: string | null
  pack_count?: number | null
  age_group?: string | null
  rating_avg?: number | null
  rating_count?: number | null
  margin_bucket?: string | null
  popularity_score?: number | null
  score?: number
}

export interface SearchResponse {
  items: SearchResultItem[]
  suggestions: SearchSuggestion[]
  facets?: Record<string, string[]>
  safety?: SearchSafety
  meta: {
    page: number
    limit: number
    total: number
    tookMs: number
    source: string
    query: string
  }
  debug?: Record<string, unknown>
}

export interface SearchFilters {
  category?: string
  inStockOnly?: boolean
  ageGroup?: string
}

export interface SearchOptions {
  page?: number
  limit?: number
  includeSuggestions?: boolean
  includeDebug?: boolean
}
