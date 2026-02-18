type FriendlyParts = {
  baseName: string
  variantSize: string | null
  fullName: string
}

const UNIT_TOKENS = new Set(['mg', 'mcg', 'g', 'gm', 'ml', 'oz', 'lb', 'iu', 'cc', '%', 'fl', 'in', 'yd'])

const ALWAYS_UPPER = new Set([
  'SPF',
  'UV',
  'XL',
  'XXL',
  'X-LARGE',
  'XX-LARGE',
  '3D',
  '2D',
  'A/B'
])

// Note: some abbreviations (ex: DR) are context-dependent and are handled separately.
const ABBREV_MAP: Record<string, string> = {
  TB: 'Tablets',
  TAB: 'Tablets',
  TABS: 'Tablets',
  CP: 'Capsules',
  CAP: 'Capsules',
  CAPS: 'Capsules',
  GC: 'Gel Caps',
  LQGL: 'Liquid Gels',
  CPLT: 'Caplets',
  SFG: 'Softgels',
  CW: 'Chewables',
  SS: 'Oral Suspension',
  LQ: 'Liquid',
  SL: 'Solution',
  CR: 'Cream',
  OI: 'Ointment',
  GL: 'Gel',
  LT: 'Lotion',
  SP: 'Spray',
  SN: 'Nasal Spray',
  AE: 'Aerosol',
  MW: 'Mouthwash',
  PS: 'Paste',
  PW: 'Powder',
  SU: 'Suppositories',
  EN: 'Enema',
  PA: 'Pads',
  AP: 'Adhesive Pads',
  DS: 'Dressing',
  TP: 'Tape',
  BR: 'Bar',
  ST: 'Stick',
  KT: 'Kit',
  PC: 'Pack',
  EQ: 'Equipment',
  SB: 'Support Brace',
  EC: 'Enteric Coated',
  ER: 'Extended Release',
  IR: 'Immediate Release',
  MS: 'Maximum Strength',
  RS: 'Regular Strength',
  ND: 'Non-Drowsy',
  SF: 'Sugar Free',
  INFT: "Infant",
  CHD: "Children's",
  JR: 'Junior'
  ,
  // Common vendor shorthand / descriptors
  ATHL: 'Athletic',
  ELST: 'Elastic',
  BND: 'Bandage',
  ADH: 'Adhesive',
  PAD: 'Pads',
  LRG: 'Large',
  MED: 'Medium',
  SML: 'Small',
  CHY: 'Cherry',
  ORN: 'Orange',
  GRP: 'Grape',
  LEM: 'Lemon',
  RASP: 'Raspberry',
  STR: 'Sterile'
  ,
  ACETAMIN: 'Acetaminophen'
}

function toTitleCaseWord(word: string): string {
  if (!word) return word
  if (ALWAYS_UPPER.has(word.toUpperCase())) return word.toUpperCase()

  // Keep hyphenated compounds as Title-Case per segment (Accu-Chek, Non-Drowsy, etc.)
  if (word.includes('-') && !word.startsWith('-') && !word.endsWith('-')) {
    return word
      .split('-')
      .map((part) => toTitleCaseWord(part))
      .join('-')
  }

  // Preserve slash tokens (A/D) if already in a compact form.
  if (word.includes('/') && word === word.toUpperCase() && word.length <= 5) return word

  // Preserve short all-caps tokens (STR, LRG, LDR) and tokens containing digits (SKUs) unless they're units.
  const isAllCaps = word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word)
  if ((isAllCaps && word.length <= 3) || /\d/.test(word)) {
    if (!UNIT_TOKENS.has(word.toLowerCase())) return word
  }

  // Keep mg/ml/etc lowercase
  if (UNIT_TOKENS.has(word.toLowerCase())) return word.toLowerCase()

  // Handle possessives like Children's
  const lower = word.toLowerCase()
  if (lower.endsWith("'s") && word.length > 2) {
    const stem = lower.slice(0, -2)
    return stem.charAt(0).toUpperCase() + stem.slice(1) + "'s"
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function splitNumericUnitToken(token: string): string[] {
  // 200MG -> ["200", "mg"]
  const m = token.match(/^(\d+(?:\.\d+)?)(MG|MCG|G|GM|ML|OZ|LB|IU|CC|%)$/i)
  if (!m) return [token]
  return [m[1], m[2].toLowerCase()]
}

function normalizeMeasurements(input: string): string {
  let s = input

  // 4X4N, 2x3n -> 4 x 4 in
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*n\b/gi, '$1 x $2 in')

  // 1N, 0.5N -> 1 in
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*n\b/gi, '$1 in')

  // 1NX5Y -> 1 in x 5 yd (common bandage/packing formats)
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*in\s*[x×]\s*(\d+(?:\.\d+)?)\s*y\b/gi, '$1 in x $2 yd')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*n\s*[x×]\s*(\d+(?:\.\d+)?)\s*y\b/gi, '$1 in x $2 yd')

  // 8OZ / 16OZ etc in text segments
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*FL\s*OZ\b/gi, '$1 fl oz')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*OZ\b/gi, '$1 oz')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*ML\b/gi, '$1 ml')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*MCG\b/gi, '$1 mcg')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*MG\b/gi, '$1 mg')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*GM\b/gi, '$1 g')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*G\b/gi, '$1 g')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*LB\b/gi, '$1 lb')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*IU\b/gi, '$1 IU')
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*CC\b/gi, '$1 cc')

  // Slash strengths: 160MG/5ML -> 160 mg/5 ml
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*MG\s*\/\s*(\d+(?:\.\d+)?)\s*ML\b/gi,
    '$1 mg/$2 ml'
  )

  return normalizeWhitespace(s)
}

function expandAbbreviations(input: string): string {
  const raw = normalizeWhitespace(input.replace(/[_]+/g, ' '))
  const tokens = raw
    .split(' ')
    .flatMap((t) => {
      // SS160MG/5ML -> ["SS", "160MG/5ML"]
      const m = t.match(/^([A-Z]{2,5})(\d.*)$/)
      if (m && ABBREV_MAP[m[1].toUpperCase()]) {
        return [m[1], m[2]]
      }
      return [t]
    })
    .flatMap((t) => splitNumericUnitToken(t))

  const hasDosageUnits = tokens.some((t) => UNIT_TOKENS.has(t.toLowerCase())) || /\b\d+\s*(mg|mcg)\b/i.test(raw)
  const likelyOralSolid =
    /\b(TB|TAB|TABS|CP|CAP|CAPS|CPLT|SFG|LQGL)\b/i.test(raw) || tokens.some((t) => ['tablets', 'capsules', 'caplets', 'softgels'].includes(t.toLowerCase()))

  const expanded = tokens.map((token) => {
    const upper = token.toUpperCase()

    // Context-dependent: DR = Delayed Release (pills) vs Drops (eye/ear)
    if (upper === 'DR') {
      if (likelyOralSolid && hasDosageUnits) return 'Delayed Release'
      if (/\b(eye|ear|drop|drops)\b/i.test(raw)) return 'Drops'
      return 'Delayed Release'
    }

    // Common shorthands
    if (upper === 'W/') return 'with'
    if (upper.startsWith('W/')) return `with ${token.slice(2)}`

    return ABBREV_MAP[upper] ?? token
  })

  return normalizeWhitespace(expanded.join(' '))
}

function normalizeDuration(input: string): string {
  // 24HR, 12H -> 24-Hour, 12-Hour
  return input
    .replace(/\b(\d+)\s*HR\b/gi, '$1-Hour')
    .replace(/\b(\d+)\s*H\b/gi, '$1-Hour')
}

function finalizeCasing(input: string): string {
  const tokens = normalizeWhitespace(input).split(' ')
  const cased = tokens.map((t) => {
    // Keep numbers as-is
    if (/^\d+(?:\.\d+)?$/.test(t)) return t

    // Keep x in measurements lower
    if (t.toLowerCase() === 'x') return 'x'

    // Keep IU uppercase
    if (t.toUpperCase() === 'IU') return 'IU'

    // Handle "fl oz"
    if (t.toLowerCase() === 'fl') return 'fl'
    if (t.toLowerCase() === 'oz') return 'oz'

    return toTitleCaseWord(t)
  })

  return normalizeWhitespace(cased.join(' '))
}

function extractVariantInfoFromName(name: string): { base: string; variant: string | null } {
  const raw = normalizeMeasurements(normalizeWhitespace(name))

  // Common: "... 24 CPLT" -> base keeps suffix, variant "24"
  {
    const m = raw.match(
      /\s+(\d+(?:\.\d+)?)\s+(CPLT|TB|TAB|TABS|CP|CAP|CAPS|GC|LQGL|SFG|CW|PA|AP|DS|TP|KT|PC|BR|ST|SU|EN)\b/i
    )
    if (m && m.index != null) {
      const variant = m[1]
      const matchText = m[0]
      const base = normalizeWhitespace(raw.replace(matchText, ` ${m[2]}`))
      return { base, variant }
    }
  }

  // Common: "... 100 ct" / "... 100count"
  {
    const m = raw.match(/\s+(\d+(?:\.\d+)?)\s*(ct|count|ea)\s*$/i)
    if (m && m.index != null) {
      const variant = `${m[1]} count`
      const base = normalizeWhitespace(raw.slice(0, m.index))
      return { base, variant }
    }
  }

  // Size at end: "... 8 oz" / "... 15 ml" / "... 4 fl oz"
  {
    const m = raw.match(/\s+(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|ml|mcg|mg|g|gm|lb|iu|cc|%)\s*$/i)
    if (m && m.index != null) {
      const unit = m[2].replace(/\s+/g, ' ')
      const variant = `${m[1]} ${unit}`
      const base = normalizeWhitespace(raw.slice(0, m.index))
      return { base, variant }
    }
  }

  // Size not at the end (often followed by flavor/age tokens): pick the last package-size match.
  {
    const re = /\b(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|ml|g|gm|lb)\b/gi
    let lastMatch: RegExpExecArray | null = null
    let m: RegExpExecArray | null
    while ((m = re.exec(raw)) !== null) {
      lastMatch = m
    }
    if (lastMatch && lastMatch.index != null) {
      const num = lastMatch[1]
      const unit = lastMatch[2].replace(/\s+/g, ' ')
      const matchText = lastMatch[0]
      const base = normalizeWhitespace(raw.replace(matchText, ' '))
      const variant = `${num} ${unit}`
      return { base, variant }
    }
  }

  // Last resort: trailing bare number => count
  {
    const m = raw.match(/\s+(\d+(?:\.\d+)?)\s*$/)
    if (m && m.index != null) {
      const variant = `${m[1]} count`
      const base = normalizeWhitespace(raw.slice(0, m.index))
      return { base, variant }
    }
  }

  return { base: raw, variant: null }
}

function dedupeTokenPatterns(value: string): string {
  const tokens = normalizeWhitespace(value).split(' ').filter(Boolean)
  if (tokens.length < 4) return normalizeWhitespace(value)

  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const prev = out[out.length - 1]
    if (prev && prev.toLowerCase() === t.toLowerCase()) continue

    // Remove immediate repeated bigram: "Adhesive Pads Adhesive Pads"
    const a0 = out[out.length - 2]
    const a1 = out[out.length - 1]
    if (
      a0 &&
      a1 &&
      i + 1 < tokens.length &&
      a0.toLowerCase() === t.toLowerCase() &&
      a1.toLowerCase() === tokens[i + 1].toLowerCase()
    ) {
      // Skip current and next token
      i++
      continue
    }

    out.push(t)
  }
  return normalizeWhitespace(out.join(' '))
}

export function makeFriendlyBaseName(rawBaseName: string): string {
  let s = rawBaseName || ''
  s = s.replace(/[–—]/g, '-')
  s = normalizeWhitespace(s)
  s = normalizeDuration(s)
  s = expandAbbreviations(s)
  s = normalizeMeasurements(s)
  s = dedupeTokenPatterns(s)
  s = finalizeCasing(s)

  // Cleanup stray spaces around punctuation
  s = s.replace(/\s+\)/g, ')').replace(/\(\s+/g, '(')
  s = s.replace(/\s+,/g, ',')
  s = s.replace(/\s+\./g, '.')
  // Keep percents tight: "53.4 %" -> "53.4%"
  s = s.replace(/(\d)\s*%/g, '$1%')
  return s
}

export function makeFriendlyVariantSize(rawVariantSize: string | null | undefined): string | null {
  const raw = (rawVariantSize || '').trim()
  if (!raw) return null
  if (raw.toLowerCase() === 'standard') return null

  let s = raw
  s = normalizeDuration(s)
  s = normalizeMeasurements(s)

  // Normalize counts
  s = s.replace(/\b(\d+)\s*(ct|count|ea)\b/gi, '$1 count')
  s = s.replace(/\b(\d+)\s*pk\b/gi, '$1 pack')

  // If it's just a number, treat it as count
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    s = `${s} count`
  }

  return finalizeCasing(s)
}

export function composeFriendlyFullName(baseName: string, variantSize: string | null): string {
  const base = makeFriendlyBaseName(baseName)
  const variant = makeFriendlyVariantSize(variantSize)
  return variant ? `${base} (${variant})` : base
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripVariantTokenFromName(rawName: string, rawVariant: string): string {
  let s = normalizeWhitespace(rawName)
  const v = normalizeWhitespace(rawVariant)
  if (!v) return s

  // Prefer removing the full raw token first (113GM)
  s = normalizeWhitespace(s.replace(new RegExp(`\\b${escapeRegExp(v)}\\b`, 'i'), ' '))

  // If variant starts with a number, also remove that standalone number (20 STR)
  const m = v.match(/^(\d+(?:\.\d+)?)/)
  if (m) {
    s = normalizeWhitespace(s.replace(new RegExp(`\\b${escapeRegExp(m[1])}\\b`, 'i'), ' '))
  }

  return s
}

export function makeFriendlyProductParts(
  rawName: string,
  rawBaseProductName?: string | null,
  rawVariantSize?: string | null
): FriendlyParts {
  const baseFromDb = (rawBaseProductName || '').trim()
  const variantFromDb = (rawVariantSize || '').trim()
  const variantFromDbNormalized =
    variantFromDb && variantFromDb.toLowerCase() === 'standard' ? '' : variantFromDb

  // Prefer DB-provided split when present, but still refine when missing/messy.
  let baseSource = baseFromDb || rawName
  let variantSource: string | null = variantFromDbNormalized || null

  // If variant is missing, try to extract from the base source (this also helps if baseFromDb still contains size/count).
  if (!variantSource) {
    const extracted = extractVariantInfoFromName(baseSource)
    baseSource = extracted.base
    variantSource = extracted.variant
  }

  // If we have a variant, try to remove its token from the base (prevents "20 STR (20 count)" duplication).
  if (variantSource) {
    baseSource = stripVariantTokenFromName(baseSource, variantSource)
  }

  const baseName = makeFriendlyBaseName(baseSource)
  const variantSize = makeFriendlyVariantSize(variantSource)
  const fullName = composeFriendlyFullName(baseName, variantSize)
  return { baseName, variantSize, fullName }
}

