import { t } from '@lingui/core/macro'

// Read at call time, never at import: the locale is not up yet when this module loads.
export function filingTurnRequest(text: string): string {
  const quoted = text
    .split('\n')
    .map((line) => (line.length > 0 ? `> ${line}` : '>'))
    .join('\n')
  return `${t`Please file this into the vault's analysis folder as a markdown note. Put which project it came from on the first line, and link any related notes with [[links]]:`}\n\n${quoted}`
}
