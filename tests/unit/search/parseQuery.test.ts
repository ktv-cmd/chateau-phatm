import { describe, expect, it } from 'vitest'
import { parseQuery } from '@/lib/search/parseQuery'

describe('parseQuery', () => {
  it('detects dosage values', () => {
    const result = parseQuery('Tylenol 500mg tablets')
    expect(result.dosage?.value).toBe(500)
    expect(result.dosage?.unit).toBe('mg')
  })

  it('detects complex dosage formats', () => {
    const result = parseQuery('children tylenol 160 mg/5ml')
    expect(result.dosage?.value).toBe(160)
    expect(result.dosage?.unit).toBe('mg')
  })

  it('detects forms', () => {
    expect(parseQuery('liquid allergy medicine').form).toBe('liquid')
    expect(parseQuery('chewable vitamin').form).toBe('chewable')
    expect(parseQuery('softgel supplement').form).toBe('softgel')
  })

  it('detects count and size', () => {
    expect(parseQuery('100 count acetaminophen').count?.value).toBe(100)
    expect(parseQuery('4 oz cough syrup').count?.unit).toBe('oz')
  })

  it('detects age intent', () => {
    expect(parseQuery('kids fever medicine').ageIntent).toBe('kids')
    expect(parseQuery('infant ibuprofen').ageIntent).toBe('infant')
    expect(parseQuery('adult allergy relief').ageIntent).toBe('adult')
  })
})
