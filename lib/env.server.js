const { z } = require('zod')

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional()
)

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .regex(/^eyJ/, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must look like a JWT'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .regex(/^eyJ/, 'SUPABASE_SERVICE_ROLE_KEY must look like a JWT'),
  NEXT_PUBLIC_SHEETS_WEBHOOK_URL: optionalUrl
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  // eslint-disable-next-line no-console
  console.error(`Invalid environment variables:\n${issues}`)
  throw new Error('Invalid environment variables')
}

module.exports = parsed.data
