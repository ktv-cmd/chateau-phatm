import { normalizeQuery, tokenizeQuery } from '@/lib/search/normalizeQuery'
import { resolveIngredient, SYMPTOM_MAP } from '@/lib/search/synonyms'

export interface QuerySignals {
  raw: string
  normalized: string
  tokens: string[]
  dosage?: { value: number; unit: string; text: string }
  count?: { value: number; unit: string; text: string }
  form?: string
  ageIntent?: 'infant' | 'kids' | 'adult' | 'senior'
  detectedIngredients: string[]
  detectedSymptoms: string[]
}

const DOSAGE_REGEX = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|mL|oz|%)/i
const COUNT_REGEX = /(\d+)\s*(count|ct|tabs|tablets|caps|capsules|softgels|gummies|ml|oz)/i
const FORM_TERMS = ['tablet', 'tablets', 'capsule', 'capsules', 'gel cap', 'softgel', 'liquid', 'syrup', 'chewable', 'gummy']
const AGE_TERMS: Record<string, QuerySignals['ageIntent']> = {
  infant: 'infant',
  baby: 'infant',
  toddler: 'kids',
  child: 'kids',
  children: 'kids',
  kids: 'kids',
  adult: 'adult',
  senior: 'senior'
}

export function parseQuery(raw: string): QuerySignals {
  const normalized = normalizeQuery(raw)
  const tokens = tokenizeQuery(raw)

  const dosageMatch = normalized.match(DOSAGE_REGEX)
  const countMatch = normalized.match(COUNT_REGEX)

  const form = FORM_TERMS.find((term) => normalized.includes(term))

  let ageIntent: QuerySignals['ageIntent']
  for (const token of tokens) {
    const found = AGE_TERMS[token]
    if (found) {
      ageIntent = found
      break
    }
  }

  const detectedIngredients = new Set<string>()
  const detectedSymptoms = new Set<string>()

  tokens.forEach((token) => {
    const ingredient = resolveIngredient(token)
    if (ingredient) detectedIngredients.add(ingredient)
  })

  Object.keys(SYMPTOM_MAP).forEach((symptom) => {
    if (normalized.includes(symptom)) {
      detectedSymptoms.add(symptom)
    }
  })

  return {
    raw,
    normalized,
    tokens,
    dosage: dosageMatch
      ? { value: Number(dosageMatch[1]), unit: dosageMatch[2].toLowerCase(), text: dosageMatch[0] }
      : undefined,
    count: countMatch
      ? { value: Number(countMatch[1]), unit: countMatch[2].toLowerCase(), text: countMatch[0] }
      : undefined,
    form,
    ageIntent,
    detectedIngredients: Array.from(detectedIngredients),
    detectedSymptoms: Array.from(detectedSymptoms)
  }
}
