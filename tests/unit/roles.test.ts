import { describe, expect, it } from 'vitest'
import { isAdmin, isSuperAdmin, isAdminEmail } from '@/lib/roles'

describe('isAdmin', () => {
  it('returns true when role is ADMIN', () =>
    expect(isAdmin({ role: 'ADMIN', email: 'sarah@chateau.com' })).toBe(true))

  it('returns true for super admin by email even with CUSTOMER role', () =>
    expect(isAdmin({ role: 'CUSTOMER', email: 'admin@chateau-demo.com' })).toBe(true))

  it('returns false when role is CUSTOMER', () =>
    expect(isAdmin({ role: 'CUSTOMER', email: 'jane@gmail.com' })).toBe(false))

  it('returns false for null', () => expect(isAdmin(null)).toBe(false))

  it('returns false for undefined', () => expect(isAdmin(undefined)).toBe(false))
})

describe('isSuperAdmin', () => {
  it('returns true for main admin email', () =>
    expect(isSuperAdmin('admin@chateau-demo.com')).toBe(true))

  it('is case-insensitive', () =>
    expect(isSuperAdmin('ADMIN@CHATEAU-DEMO.COM')).toBe(true))

  it('returns false for other @chateau.com emails', () =>
    expect(isSuperAdmin('sarah@chateau.com')).toBe(false))

  it('returns false for null and undefined', () => {
    expect(isSuperAdmin(null)).toBe(false)
    expect(isSuperAdmin(undefined)).toBe(false)
  })
})

describe('isAdminEmail', () => {
  it('returns true for @chateau.com domain', () => {
    expect(isAdminEmail('sarah@chateau.com')).toBe(true)
    expect(isAdminEmail('mike@chateau.com')).toBe(true)
  })

  it('returns true for super admin email', () =>
    expect(isAdminEmail('admin@chateau-demo.com')).toBe(true))

  it('is case-insensitive', () =>
    expect(isAdminEmail('SARAH@CHATEAU.COM')).toBe(true))

  it('returns false for customer emails', () =>
    expect(isAdminEmail('jane@gmail.com')).toBe(false))

  it('returns false for null and undefined', () => {
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
