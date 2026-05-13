const SUPER_ADMIN_EMAIL = 'admin@chateau-demo.com'
const ADMIN_EMAIL_DOMAIN = '@chateau.com'

// Checks if a full user object (from public.users) is an admin.
// Use this in server pages and API routes where getCurrentUser() has been called.
export function isAdmin(user: { role?: string; email?: string | null } | null | undefined): boolean {
  if (!user) return false
  return user.role === 'ADMIN' || isSuperAdmin(user.email)
}

// Main admin only — the original owner account.
export function isSuperAdmin(email?: string | null): boolean {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}

// Email-pattern check — used in middleware and client-side where we only have
// the auth user (no role from public.users yet).
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return lower.endsWith(ADMIN_EMAIL_DOMAIN) || lower === SUPER_ADMIN_EMAIL.toLowerCase()
}
