import { describe, expect, it } from 'vitest'
import { expandSynonyms, resolveIngredient, SYNONYM_MAP } from '@/lib/search/synonyms'

describe('synonyms', () => {
  it('expands synonyms for core ingredients', () => {
    const synonyms = expandSynonyms('acetaminophen')
    expect(synonyms).toContain('tylenol')
    expect(synonyms).toContain('fever reducer')
  })

  it('resolves ingredient from brand term', () => {
    expect(resolveIngredient('tylenol')).toBe('acetaminophen')
    expect(resolveIngredient('advil')).toBe('ibuprofen')
  })

  it('has expected baseline entries', () => {
    expect(SYNONYM_MAP.acetaminophen).toContain('tylenol')
    expect(SYNONYM_MAP.ibuprofen).toContain('advil')
  })
})
