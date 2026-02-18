import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname)
    }
  },
  test: {
    environment: 'node',
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
