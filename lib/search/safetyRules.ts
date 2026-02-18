export interface SafetyRule {
  ingredient: string
  age_group: 'infant' | 'kids' | 'adult' | 'senior'
  max_dosage_mg?: number
  disallow?: boolean
  warning_text: string
}

export const SAFETY_RULES: SafetyRule[] = [
  {
    ingredient: 'acetaminophen',
    age_group: 'kids',
    max_dosage_mg: 160,
    warning_text: 'Pediatric acetaminophen doses above 160mg may be unsafe.'
  },
  {
    ingredient: 'ibuprofen',
    age_group: 'infant',
    disallow: true,
    warning_text: 'Ibuprofen is not recommended for infants unless directed by a doctor.'
  }
]
