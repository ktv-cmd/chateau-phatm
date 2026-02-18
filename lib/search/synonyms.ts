import { normalizeQuery } from '@/lib/search/normalizeQuery'

export const SYNONYM_MAP: Record<string, string[]> = {
  acetaminophen: ['tylenol', 'pain reliever', 'fever reducer', 'apap'],
  ibuprofen: ['advil', 'motrin', 'anti inflammatory', 'inflammation'],
  cetirizine: ['zyrtec', 'antihistamine', 'allergy'],
  loratadine: ['claritin', 'antihistamine', 'allergy'],
  naproxen: ['aleve', 'anti inflammatory'],
  dextromethorphan: ['cough suppressant', 'dm'],
  guaifenesin: ['expectorant', 'mucus relief'],
  'calcium carbonate': ['tums', 'antacid', 'heartburn'],
  omeprazole: ['prilosec', 'acid reducer'],
  diphenhydramine: ['benadryl', 'allergy', 'sleep aid'],
  aspirin: ['asa', 'pain reliever']
}

export const SYMPTOM_MAP: Record<string, string[]> = {
  headache: ['acetaminophen', 'ibuprofen', 'naproxen', 'aspirin'],
  fever: ['acetaminophen', 'ibuprofen'],
  allergy: ['cetirizine', 'loratadine', 'diphenhydramine'],
  cough: ['dextromethorphan', 'guaifenesin'],
  cold: ['dextromethorphan', 'guaifenesin']
}

export function normalizeSynonyms(map: Record<string, string[]>): Record<string, string[]> {
  const normalized: Record<string, string[]> = {}
  Object.entries(map).forEach(([key, values]) => {
    const normalizedKey = normalizeQuery(key)
    normalized[normalizedKey] = values.map((value) => normalizeQuery(value))
  })
  return normalized
}

const NORMALIZED_SYNONYMS = normalizeSynonyms(SYNONYM_MAP)

export function expandSynonyms(term: string): string[] {
  const normalized = normalizeQuery(term)
  const entries = Object.entries(NORMALIZED_SYNONYMS)
  const directMatch = NORMALIZED_SYNONYMS[normalized]
  if (directMatch) return [normalized, ...directMatch]

  for (const [key, values] of entries) {
    if (values.includes(normalized)) {
      return [normalized, key, ...values]
    }
  }
  return [normalized]
}

export function resolveIngredient(term: string): string | null {
  const normalized = normalizeQuery(term)
  if (NORMALIZED_SYNONYMS[normalized]) {
    return normalized
  }
  for (const [key, values] of Object.entries(NORMALIZED_SYNONYMS)) {
    if (values.includes(normalized)) {
      return key
    }
  }
  return null
}
