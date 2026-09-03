import { t } from '@lingui/core/macro'

// The line every teammate's brief ends with, naming the language the screen
// is read in. It lives in the dictionary so a Korean screen names Korean, and
// it is built here, on the screen, because the main process cannot read the
// dictionary.
export function spokenLine(): string {
  return t`Speak English only, from your first sentence on: the short note saying what you are about to do, every progress note, every question and the report. Code, commands, paths and identifiers stay as they are.`
}
