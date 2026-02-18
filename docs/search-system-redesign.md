# Pharmacy Search System Redesign

This document redesigns search for the pharmacy marketplace with a focus on mobile users, safety, and conversion.

## Current State (baseline)

Search is a simple `ilike` OR across multiple columns, which gives no ranking, no typo handling, and no safety logic.

```10:45:lib/db/products.ts
  if (search) {
    const trimmed = search.trim()
    if (trimmed) {
      const terms = splitSearchTerms(trimmed)
      const columns = [
        'name',
        'base_product_name',
        'description',
        'brand',
        'category',
        'sku',
        'variant_size'
      ]
      for (const term of terms) {
        const orFilters = columns.map((col) => `${col}.ilike.%${term}%`).join(',')
        query = query.or(orFilters)
      }
    }
  }
```

## 1) Search Architecture Plan

### Recommendation
- Primary search engine: **Meilisearch (self-hosted)** for typo tolerance, synonyms, fast ranked retrieval, and sub-200ms response.
- Source of truth: **Postgres (Supabase)** with normalization and safety metadata.
- Fallback: **Postgres FTS + pg_trgm** for failover or for smaller scale.

This keeps the system hostable on SiteGround while supporting scale and fast relevance.

### Data Flow
1. Product data changes in Postgres.
2. Normalization pipeline derives search fields (ingredients, dosage, form, age group).
3. Search index is updated in Meilisearch (incremental updates).
4. Search API queries Meilisearch, then applies safety filters and inventory constraints.

### Indexing Strategy
Create a single `products_search` index with denormalized fields:
- `name`, `brand`, `base_product_name`, `active_ingredients`, `symptoms`
- `category`, `form`, `dosage_value`, `dosage_unit`, `variant_size`
- `age_group`, `is_rx`, `is_restricted`, `in_stock`, `inventory_qty`
- `rating_avg`, `rating_count`, `margin_bucket`, `sales_rank`
- `synonyms_expanded` (pre-expanded list for fast matching)

If Meilisearch is not available, use Postgres FTS with:
- `search_vector` (tsvector)
- `pg_trgm` indexes for typo handling

## 2) Relevance Strategy

### Ranking Formula (example)
```
score =
  6.0 * exact_name_match +
  5.0 * brand_match +
  4.5 * active_ingredient_match +
  4.0 * synonym_match +
  3.0 * symptom_match +
  2.0 * category_match +
  1.5 * description_match +
  1.0 * popularity_signal

score = score
  * stock_boost(in_stock, inventory_qty)
  * rating_boost(rating_avg, rating_count)
  * margin_boost(margin_bucket)
  * safety_penalty(age_mismatch, restricted_mismatch)
```

### Boosts
- In-stock items (hard requirement or strong boost).
- Higher-rated items.
- Higher-margin items (optional).

### Demotions
- Out-of-stock items.
- Restricted or ineligible items.
- Age mismatch between query intent and product age group.

## 3) Synonym Dictionary Structure

Store as a table or JSON for quick load into the search layer.

```json
{
  "acetaminophen": ["tylenol", "pain reliever", "fever reducer", "apap"],
  "ibuprofen": ["advil", "motrin", "anti inflammatory", "inflammation"],
  "cetirizine": ["zyrtec", "antihistamine", "allergy"],
  "loratadine": ["claritin", "antihistamine", "allergy"],
  "naproxen": ["aleve", "anti inflammatory"],
  "dextromethorphan": ["cough suppressant", "dm"],
  "guaifenesin": ["expectorant", "mucus relief"],
  "calcium carbonate": ["tums", "antacid", "heartburn"],
  "omeprazole": ["prilosec", "acid reducer"],
  "diphenhydramine": ["benadryl", "allergy", "sleep aid"]
}
```

Directional synonyms for safety:
- Brand -> generic (safe)
- Symptom -> ingredient or class (safe)
- Ingredient -> brand (safe)
- Do not substitute Rx items for OTC queries

## 4) Query Understanding Layer

### Parse Targets
- Dosage: `500mg`, `5 mL`, `0.25%`
- Quantity: `100 tablets`, `60 ct`, `8 oz`
- Form: `tablet`, `capsule`, `gel cap`, `liquid`, `chewable`
- Age intent: `kids`, `children`, `infant`, `adult`

### Parsing Logic (outline)
```
tokens = normalize(query)
dosage = match /(\d+(\.\d+)?)\s*(mg|mcg|g|ml|oz|%)/i
count = match /(\d+)\s*(count|ct|tabs|tablets|caps|capsules|softgels|gummies)/i
form = match against form_dictionary
age_intent = match /(infant|baby|toddler|children|kids|adult|senior)/i
symptom = match against symptom_dictionary
ingredient = match against ingredient_dictionary
```

Use parsed signals for:
- Filtering (form, count, dosage range).
- Ranking boosts (match to dosage, form, and age group).
- Safety rules (age and dosage checks).

## 5) Autocomplete System

### Suggestions
- Products (with thumbnail + dosage + form preview).
- Categories.
- Symptoms.
- Brands and active ingredients.

### Ranking (autocomplete)
- Prefix match on name and brand.
- Recent searches and click-through rate (CTR).
- In-stock first.

## 6) Safety Logic

Examples:
- Query: "kids tylenol 500mg" -> flag mismatch (adult dosage).
- Query: "infant ibuprofen" -> show safe age-specific variants or warning.

Rules:
- If query includes age intent, **exclude** products with incompatible age group.
- If dosage exceeds pediatric range, show warning and demote.
- Do not auto-swap Rx items into OTC queries.

## 7) UX Improvements

- "Did you mean?" with typo corrections and common misspellings.
- Highlight matched terms in results.
- Show related symptoms and related generics for education.
- Provide "compare sizes" for the same base product.

## 8) Edge Case Handling

- No results: suggest spelling fixes, remove filters, show symptom categories.
- Only out-of-stock: show closest in-stock equivalents and "notify me".
- Variant confusion: group variants under base product (already supported).
- Duplicate listings: de-dupe by `base_product_name` + `brand`.
- Image mismatch detection: run OCR or label matching and flag mismatches for review.

## 9) Performance Requirements

- Search results under 200ms (P95).
- Autocomplete under 100ms.
- Cache at API and CDN layer (short TTL, e.g., 30-120 seconds).
- Keep search payload small (limit fields for list view).
- Precompute ranking signals offline.

## 10) Implementation Details

### Pseudocode for Ranking Logic
```ts
function rankProduct(product, querySignals) {
  let score = 0
  score += product.nameExactMatch ? 6.0 : 0
  score += product.brandMatch ? 5.0 : 0
  score += product.ingredientMatch ? 4.5 : 0
  score += product.synonymMatch ? 4.0 : 0
  score += product.symptomMatch ? 3.0 : 0
  score += product.categoryMatch ? 2.0 : 0
  score += product.descriptionMatch ? 1.5 : 0
  score += product.popularityScore * 1.0

  score *= product.inStock ? 1.2 : 0.2
  score *= product.ratingBoost
  score *= product.marginBoost

  if (querySignals.ageIntent && product.ageGroup !== querySignals.ageIntent) {
    score *= 0.1
  }
  if (product.isRestricted) {
    score *= 0.05
  }
  return score
}
```

### Database Schema Adjustments (Postgres)
```sql
-- Core product safety + search fields
alter table products
  add column active_ingredients text[],
  add column symptom_tags text[],
  add column form text,
  add column dosage_value numeric,
  add column dosage_unit text,
  add column pack_count integer,
  add column age_group text, -- infant, kids, adult, senior
  add column is_rx boolean default false,
  add column is_restricted boolean default false,
  add column rating_avg numeric default 0,
  add column rating_count integer default 0,
  add column margin_bucket text,
  add column popularity_score numeric default 0,
  add column search_text text; -- denormalized raw string

-- Synonyms table
create table search_synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  synonyms text[] not null,
  direction text not null default 'bidirectional'
);

-- Safety rules table
create table safety_rules (
  id uuid primary key default gen_random_uuid(),
  ingredient text not null,
  age_group text not null,
  max_dosage_mg numeric,
  warning_text text
);
```

### Indexing Fields
```sql
-- Full text + typo
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create index products_search_text_idx
  on products using gin (to_tsvector('english', unaccent(search_text)));

create index products_name_trgm_idx
  on products using gin (name gin_trgm_ops);
```

### API Endpoint Example (Next.js)
```ts
// app/api/search/route.ts
import { NextResponse } from 'next/server'
import { searchProducts } from '@/lib/search'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const filters = {
    category: searchParams.get('category') || undefined,
    inStockOnly: searchParams.get('inStock') === 'true'
  }
  const results = await searchProducts(q, filters)
  return NextResponse.json(results)
}
```

### Frontend Search Component Structure (React)
```
<SearchBar>
  <SearchInput />
  <AutocompletePanel>
    <SuggestionGroup title="Products" />
    <SuggestionGroup title="Symptoms" />
    <SuggestionGroup title="Categories" />
  </AutocompletePanel>
</SearchBar>

<SearchResults>
  <FiltersSidebar />
  <ResultGrid />
  <SafetyBanner />
</SearchResults>
```

### Search Library Structure (suggested)
```
lib/search/
  normalizeQuery.ts
  parseQuery.ts
  synonyms.ts
  rank.ts
  meilisearchClient.ts
  search.ts
```
