import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { lingui } from '@lingui/vite-plugin'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          '@lingui/babel-plugin-lingui-macro',
          // The app builds with the compiler (electron.vite.config.ts), and
          // some effects only terminate because of its memoization; tests
          // must share those semantics or they exercise a different app.
          ['babel-plugin-react-compiler', { target: '19' }],
        ],
      },
    }),
    lingui(),
  ],
  resolve: { alias: { '@': resolve('src') } },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup-i18n.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'electron/**/*.test.ts',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
    exclude: ['**/node_modules/**', 'tests/contract/**'],
    coverage: {
      provider: 'v8',
      // Everything the app ships, counted whether a test reached it or not, so
      // a module nobody tests reads as nothing covered rather than not there.
      include: ['src/**/*.{ts,tsx}', 'electron/**/*.ts'],
      // shadcn's, and a types file has nothing to run.
      exclude: ['src/shared/ui/**', '**/*.types.ts', '**/*.test.{ts,tsx}'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
