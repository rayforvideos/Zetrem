import { t } from '@lingui/core/macro'
import { NAME_MAX } from '../new-connector/new-connector'
import type { RefusalCode } from '../new-connector/new-connector.types'

export function refusalWhy(code: RefusalCode): string {
  switch (code) {
    case 'name-empty':
      return t`Give it a name`
    case 'name-long':
      return t`Keep the name under ${NAME_MAX} characters`
    case 'name-dash':
      return t`A name cannot start with a dash`
    case 'name-chars':
      return t`Letters, numbers, hyphens and underscores only`
    case 'name-taken':
      return t`You already have a connector by that name`
    case 'url-empty':
      return t`Paste the server address`
    case 'url-shape':
      return t`That is not a web address`
    case 'url-scheme':
      return t`The address has to be http or https`
    case 'url-insecure':
      return t`Use https, or http only for a server on this machine`
    case 'garbled':
      return t`Zetrem did not understand that request`
  }
}

const CODES: RefusalCode[] = [
  'name-empty',
  'name-long',
  'name-dash',
  'name-chars',
  'name-taken',
  'url-empty',
  'url-shape',
  'url-scheme',
  'url-insecure',
  'garbled',
]

// The main process only sends codes. Turn a code into a sentence, pass anything else through.
export function saidOrWhy(out: string): string {
  const code = CODES.find((one) => one === out)
  return code === undefined ? out : refusalWhy(code)
}
