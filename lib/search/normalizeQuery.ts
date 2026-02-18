const NON_WORD = /[^\w\s.%/]/g

export function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeQuery(value: string): string[] {
  if (!value.trim()) return []
  return normalizeQuery(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
}
