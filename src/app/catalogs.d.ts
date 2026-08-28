// A compiled lingui catalog: what the vite plugin turns a .po file into.
declare module '*.po' {
  import type { Messages } from '@lingui/core'
  export const messages: Messages
}
