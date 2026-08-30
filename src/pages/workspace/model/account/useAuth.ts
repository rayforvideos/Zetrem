import { useEffect, useState, useCallback, useRef } from 'react'
import type { AccountBusy, AccountBusyOn, AccountList, AuthStatus } from '@/entities/auth'
import { urlFrom } from '@/entities/claude-cli/lib/cli-output/cli-output'
import { reasonOf } from '@/shared/lib/failure/failure'
import { troubleLine } from '@/shared/lib/ask/ask'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { t } from '@lingui/core/macro'
import { readUsageAfter } from '../session/usage-read/usage-read'
import { accountChanged } from './account-change/account-change'
import { accountTroubleLine } from './account-trouble/account-trouble'
import { errorAfterRefresh } from './auth-error/auth-error'
import type { Refresh } from './auth-error/auth-error.types'

type Auth = {
  auth: AuthStatus | null
  authKnown: boolean
  accounts: AccountList | null
  busy: AccountBusy
  busyOn: AccountBusyOn
  loginNote: string
  recheck(): void
  addAccount(): void
  switchAccount(id: string): void
  reauthAccount(id: string): void
  removeAccount(id: string): void
  logout(): void
  installing: boolean
  install(): void
  authError: string | null
}

const CHUNK_MEMORY = 8000

export function useAuth(): Auth {
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [authKnown, setAuthKnown] = useState(false)
  const [accounts, setAccounts] = useState<AccountList | null>(null)
  const [busy, setBusy] = useState<AccountBusy>(null)
  const [busyOn, setBusyOn] = useState<AccountBusyOn>(null)
  const [loginNote, setLoginNote] = useState('')
  const [installing, setInstalling] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const refresh = useCallback((why: Refresh): void => {
    setAuthError((shown) => errorAfterRefresh(shown, why))
    window.desk
      .listAccounts()
      .then((list) => {
        if (!alive.current) return
        setAccounts(list)
        setAuth(list.auth)
      })
      .catch((cause: unknown) => {
        if (alive.current) setAuthError(troubleLine(t`Could not read your sign-in`, cause))
      })
      .finally(() => {
        if (alive.current) setAuthKnown(true)
      })
  }, [])

  const recheck = useCallback((): void => refresh('asked'), [refresh])

  useEffect(() => {
    recheck()
  }, [recheck])

  useEffect(() => {
    let seen = ''
    return window.desk.onAuthProgress((chunk) => {
      seen = `${seen}${chunk}`.slice(-CHUNK_MEMORY)
      const url = urlFrom(seen)
      if (url !== null) setLoginNote(url)
    })
  }, [])

  function run(
    kind: Exclude<AccountBusy, null>,
    on: AccountBusyOn,
    ask: () => Promise<Outcome<AccountList>>,
    failed: string,
  ): void {
    setBusy(kind)
    setBusyOn(on)
    setLoginNote('')
    setAuthError(null)
    ask()
      .then((result) => {
        if (!alive.current) return
        if (!result.ok) {
          setAuthError(
            accountTroubleLine(
              result.why,
              failed,
              t`A session is still running, so your account was not changed. Stop it and try again.`,
            ),
          )
          refresh('follow-up')
          return
        }
        setAccounts(result.value)
        setAuth(result.value.auth)
        // Everything on screen was worked out for the account that was signed
        // in a moment ago; this is the one place that says so.
        accountChanged()
        // The limits the bar is showing were read for the account that was
        // signed in a moment ago, so they are asked for again at once.
        readUsageAfter('account')
      })
      .catch((cause: unknown) => {
        if (alive.current) setAuthError(reasonOf(cause))
      })
      .finally(() => {
        if (alive.current) {
          setBusy(null)
          setBusyOn(null)
        }
      })
  }

  function addAccount(): void {
    run('add', null, () => window.desk.addAccount(), t`Sign-in did not finish.`)
  }
  function switchAccount(id: string): void {
    run('switch', { id }, () => window.desk.switchAccount(id), t`Could not switch accounts.`)
  }
  function reauthAccount(id: string): void {
    run('reauth', { id }, () => window.desk.reauthAccount(id), t`Sign-in did not finish.`)
  }
  function removeAccount(id: string): void {
    run('remove', { id }, () => window.desk.removeAccount(id), t`Could not remove the account.`)
  }

  function logout(): void {
    setBusy('signout')
    setBusyOn({ id: null })
    setLoginNote('')
    setAuthError(null)
    window.desk
      .logout()
      .then((result) => {
        if (!result.ok) {
          setAuthError(
            accountTroubleLine(
              result.why,
              t`Sign out did not take effect.`,
              t`A session is still running, so you were not signed out. Stop it and try again.`,
            ),
          )
          return
        }
        setAuth(result.value)
        if (result.value.state === 'signed-in') {
          setAuthError(t`Still signed in. Sign out did not take effect.`)
        }
        // The account this screen was worked out for has gone, the same as
        // after any other account change.
        accountChanged()
        refresh('follow-up')
      })
      .catch((cause: unknown) => setAuthError(reasonOf(cause)))
      .finally(() => {
        setBusy(null)
        setBusyOn(null)
      })
  }

  function install(): void {
    setInstalling(true)
    setAuthError(null)
    window.desk
      .installCli()
      .then(({ status, output }) => {
        setAuth(status)
        if (status.state === 'cli-missing') {
          const said = output
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .at(-1)
          setAuthError(troubleLine(t`Could not install Claude Code`, new Error(said ?? '')))
        } else {
          recheck()
        }
      })
      .catch((cause: unknown) => setAuthError(reasonOf(cause)))
      .finally(() => setInstalling(false))
  }

  return {
    auth,
    authKnown,
    accounts,
    busy,
    busyOn,
    loginNote,
    recheck,
    addAccount,
    switchAccount,
    reauthAccount,
    removeAccount,
    logout,
    installing,
    install,
    authError,
  }
}
