import { defineConfig } from '@lingui/cli'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'ko'],
  catalogs: [
    {
      path: '<rootDir>/src/shared/locales/{locale}/messages',
      include: ['src', 'electron'],
      exclude: ['**/node_modules/**', '**/*.test.ts', '**/*.test.tsx'],
    },
  ],
  format: 'po',
})
