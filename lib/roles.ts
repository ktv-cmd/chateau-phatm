// Simple admin check: hardcoded admin email
const ADMIN_EMAIL = 'admin@chateau-demo.com'

export function isAdmin(email?: string | null) {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

// Keep old function name for backward compatibility during migration
export function isOwnerRole(role?: string | null) {
  return role === 'ADMIN'
}
