import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // A barrel drags the Lingui macro in behind it, which the main process
      // cannot compile, so anything main reaches is imported by its own path.
      'fsd/no-public-api-sidestep': 'off',
      'fsd/public-api': 'off',
      'fsd/insignificant-slice': 'off',
      'fsd/inconsistent-naming': 'off',
    },
  },
])
