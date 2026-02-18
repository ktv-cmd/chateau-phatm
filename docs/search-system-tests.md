# Search System Test Plan (Phase 1)

## Scope
- Search API correctness, ranking, synonyms, typo tolerance, and fallback behavior.
- Query parsing (dosage, form, count, age intent) and safety warnings.
- Autocomplete UX and safety banner rendering.
- Performance budgets and debounce behavior.
- Deterministic fixtures for CI.

## Environment & Data
- Primary search: Meilisearch (if configured).
- Fallback: Postgres FTS/pg_trgm (simulated in tests via fixture source).
- Deterministic fixtures: `lib/search/fixtures/products.json`.
- Test mode uses `SEARCH_DATA_SOURCE=fixture` and `SEARCH_FALLBACK_SOURCE=fixture`.

## Deliverable Coverage Checklist
1. Architecture plan: Verified in `docs/search-system-redesign.md`.
2. Relevance strategy/ranking: Verified.
3. Synonym structure: Verified.
4. Query understanding/parsing: Verified.
5. Autocomplete system: Verified.
6. Safety logic: Verified.
7. UX improvements: Verified.
8. Edge cases: Verified.
9. Performance requirements: Verified.
10. Code examples (pseudocode, schema, index fields, API, frontend structure): Verified.

## Test Types & Coverage

### 1) Schema Migration Readiness
- Verify search-related columns and indexes exist or migration script is prepared.
- Validate data types for dosage/form/age_group consistency.
- Check synonym and safety tables or seed JSON availability.

### 2) API Tests (`app/api/search/route.ts`)
- Request validation (empty/short/long queries, invalid params).
- Response contract (items, suggestions, safety, meta).
- Ranking/boosting (exact > brand > synonym; in-stock > out-of-stock).
- Synonyms & typo tolerance (tylenol -> acetaminophen, asprin -> aspirin).
- Variant ordering (same base product grouped/ordered).
- Fallback when Meilisearch is unavailable.
- Security: no internal cost or supplier fields exposed.

### 3) Unit Tests (`lib/search/*`)
- Query parsing (dosage, form, count, age intent).
- Synonym normalization and ingredient resolution.
- Ranking score ordering and safety demotion.
- Safety rule evaluation (pediatric mismatch, infant ibuprofen warning).

### 4) Component Tests (React Testing Library)
- Autocomplete opens on focus/typing.
- Suggestions display and keyboard navigation.
- Selecting suggestion updates input and triggers navigation.
- Safety banner shows on warning; dismiss persists for session.
- Empty state CTA and category buttons.
- Error state message on failed API.

### 5) E2E Tests (Playwright)
- Search success (tylenol) shows suggestions and results.
- Typo tolerance (asprin -> aspirin).
- Safety warning for pediatric mismatch.
- Fallback search when Meilisearch forced down.
- Mobile viewport layout and autocomplete usability.

### 6) Performance Checks
- API response time < 300ms locally (CI budget <= 500ms).
- Debounce ensures no request per keystroke.

## Pass/Fail Criteria
- 100% tests green in CI for unit, component, and E2E suites.
- No critical safety warning regressions.
- API response time within thresholds.

## Known Assumptions
- Fixture data is used for deterministic testing.
- Meilisearch is optional; fallback behavior must be validated even if Meilisearch is not running.
