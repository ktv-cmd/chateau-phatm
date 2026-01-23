import { describe, expect, it } from 'vitest'
import { isOwnerRole } from '@/lib/roles'

describe('isOwnerRole', () => {
  it('returns true for ADMIN', () => {
    expect(isOwnerRole('ADMIN')).toBe(true)
  })

  it('returns false for other roles', () => {
    expect(isOwnerRole('CUSTOMER')).toBe(false)
    expect(isOwnerRole(null)).toBe(false)
    expect(isOwnerRole(undefined)).toBe(false)
  })
})
