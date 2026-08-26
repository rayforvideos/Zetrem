import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Three of the recommended rules ask for the opposite of what this repo
    // already decided, with a test holding each decision. They are off here
    // rather than argued with at every call site.
    rules: {
      // main-speaks-no-words.test.ts requires the exact opposite: a barrel
      // drags the Lingui macro in behind it, which the main process cannot
      // compile, so anything main reaches must be imported by its own path.
      'fsd/no-public-api-sidestep': 'off',
      // The same reason, from the other end. A public API for every segment
      // and every folder under shared/lib is a barrel the main process would
      // then have to avoid.
      'fsd/public-api': 'off',
      // A widget drawn by the one screen this app has is not an insignificant
      // slice; it is what a one-screen app looks like.
      'fsd/insignificant-slice': 'off',
      // "settings" is a mass noun here, not a plural of "setting": the slice
      // holds the one set of them the app was started with. Renaming it to
      // match twelve singular neighbours would leave the folder saying one
      // thing and everything inside it saying another.
      'fsd/inconsistent-naming': 'off',
    },
  },
])
