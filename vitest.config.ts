import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, 'tests/__mocks__/server-only.ts'),
      'next/headers': path.resolve(__dirname, 'tests/__mocks__/next-headers.ts'),
    }
  },
  test: {
    environment: 'node',
    testTimeout: 20000,
    server: {
      deps: {
        inline: ['html-encoding-sniffer', '@exodus/bytes']
      }
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test',
      SEARCH_DATA_SOURCE: 'fixture',
      SEARCH_FALLBACK_SOURCE: 'fixture',
    },
    include: [
      'tests/unit/**/*.test.ts',
      'tests/api/**/*.test.ts',
      'tests/components/**/*.test.tsx',
      'tests/components/**/*.test.ts'
    ],
    environmentMatchGlobs: [['tests/components/**', 'jsdom']],
    setupFiles: ['tests/setup.ts']
  }
})
