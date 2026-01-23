// Centralized configuration for environment variables
// These values should be set in .env.local

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  sheets: {
    webhookUrl: process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL || '',
  },
} as const

// Validation helpers
export function isSupabaseConfigured(): boolean {
  return !!(
    config.supabase.url &&
    config.supabase.url !== 'your_supabase_url' &&
    config.supabase.url.startsWith('http') &&
    config.supabase.anonKey &&
    config.supabase.anonKey !== 'your_supabase_anon_key' &&
    config.supabase.anonKey.startsWith('eyJ')
  )
}

export function isServiceRoleConfigured(): boolean {
  return !!(
    config.supabase.serviceRoleKey &&
    config.supabase.serviceRoleKey !== 'your_service_role_key' &&
    config.supabase.serviceRoleKey.startsWith('eyJ')
  )
}

export function isSheetsWebhookConfigured(): boolean {
  return !!(
    config.sheets.webhookUrl &&
    config.sheets.webhookUrl !== 'your_webhook_url' &&
    config.sheets.webhookUrl.startsWith('http')
  )
}

// Get configuration status
export function getConfigStatus() {
  return {
    supabase: {
      configured: isSupabaseConfigured(),
      url: config.supabase.url ? (config.supabase.url.length > 50 ? `${config.supabase.url.substring(0, 50)}...` : config.supabase.url) : 'Not set',
      anonKey: config.supabase.anonKey ? 'Set' : 'Not set',
    },
    serviceRole: {
      configured: isServiceRoleConfigured(),
    },
    sheets: {
      configured: isSheetsWebhookConfigured(),
      url: config.sheets.webhookUrl ? (config.sheets.webhookUrl.length > 50 ? `${config.sheets.webhookUrl.substring(0, 50)}...` : config.sheets.webhookUrl) : 'Not set',
    },
  }
}
