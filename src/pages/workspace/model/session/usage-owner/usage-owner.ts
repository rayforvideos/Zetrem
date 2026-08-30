import type { AccountList } from '@/entities/auth'

// Whose sign-in this computer is holding, as the main process worked it out:
// by matching the credentials against what Zetrem kept, never by the name in
// .claude.json, which lags a login by minutes. Nobody is a real answer, and
// the reading kept for somebody else is then simply not shown.
export function emailOf(list: AccountList | null): string | null {
  if (list === null) return null
  const here = list.here
  if (here.kind === 'named') return here.email
  if (here.kind === 'row') {
    const row = list.accounts.find((one) => one.id === here.id)
    return row === undefined || row.email.length === 0 ? null : row.email
  }
  return null
}

// A kept reading describes one account's limits. Shown to another it is not
// stale, it is untrue, and a file that names nobody could be either.
export function keptForMe(
  report: string | null,
  who: string | null,
  email: string | null,
): string | null {
  if (report === null || email === null) return null
  if (who === null || who.length === 0) return null
  return who.toLocaleLowerCase() === email.toLocaleLowerCase() ? report : null
}
