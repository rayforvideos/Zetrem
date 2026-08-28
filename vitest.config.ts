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
          // Some effects only terminate because of the compiler's memoization,
          // so tests must build with it too.
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
    // A Windows CI runner writes sixty small files in the time a laptop
    // writes six hundred; the tests that fold and index chats need the room.
    testTimeout: 20_000,
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
      include: ['src/**/*.{ts,tsx}', 'electron/**/*.ts'],
      exclude: ['src/shared/ui/**', '**/*.types.ts', '**/*.test.{ts,tsx}'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
