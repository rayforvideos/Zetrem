import { t } from '@lingui/core/macro'
import type { AccountTroubleCode } from '@/entities/auth'
import { lastLine } from '@/shared/lib/ask/ask'
import type { Why } from '@/shared/lib/outcome/outcome.types'

// The main process names what went wrong and says nothing a person reads; the
// words for it are here, where there is a catalog to read them from.
function troubleWhy(code: AccountTroubleCode): string {
  switch (code) {
    case 'switch-not-confirmed':
      return t`Zetrem put that account on this computer, but Claude Code did not report it as signed in. Nothing was changed.`
    case 'credentials-unreadable':
      return t`Zetrem could not read the Claude Code sign-in kept on this computer, so nothing was changed. Unlock your keychain and allow Zetrem to read it, then try again.`
    case 'login-not-signed-in':
      return t`Sign-in ended without an account, so nothing was changed.`
  }
}

const CODES: AccountTroubleCode[] = [
  'switch-not-confirmed',
  'credentials-unreadable',
  'login-not-signed-in',
]

// A refused account change usually carries the CLI's own last line, which is
// the best account of what happened. Two codes carry no words worth showing:
// the change was called off because a session would not stop, so nothing
// moved and the session is still there; or the person cancelled the sign-in
// themselves, which needs no explaining beyond saying so.
export function accountTroubleLine(why: Why, failed: string, stillRunning: string): string {
  if (why.code === 'timeout') return stillRunning
  if (why.code === 'cancelled') return t`Sign-in was cancelled.`
  const named = CODES.find((one) => one === why.said)
  return named === undefined ? lastLine(why.said, failed) : troubleWhy(named)
}
