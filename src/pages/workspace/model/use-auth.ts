import { useEffect, useState } from 'react'
import type { AuthStatus } from '@/entities/auth'
import { urlFrom } from '@/shared/lib/cli-output/cli-output'
import { reasonOf } from '@/shared/lib/failure/failure'
import { troubleLine } from '@/shared/lib/ask/ask'
import { t } from '@lingui/core/macro'

type Auth = {
  auth: AuthStatus | null
  authKnown: boolean
  loggingIn: boolean
  loginNote: string
  login(): void
  loggingOut: boolean
  logout(): void
  installing: boolean
  install(): void
  authError: string | null
}

const CHUNK_MEMORY = 8000

export function useAuth(): Auth {
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [authKnown, setAuthKnown] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginNote, setLoginNote] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    window.desk
      .authStatus()
      .then(setAuth)
      .catch((cause: unknown) => setAuthError(troubleLine(t`Could not read your sign-in`, cause)))
      .finally(() => setAuthKnown(true))
  }, [])

  useEffect(() => {
    let seen = ''
    return window.desk.onAuthProgress((chunk) => {
      seen = `${seen}${chunk}`.slice(-CHUNK_MEMORY)
      const url = urlFrom(seen)
      if (url !== null) setLoginNote(url)
    })
  }, [])

  function login(): void {
    setLoggingIn(true)
    setLoginNote('')
    window.desk
      .login()
      .then(setAuth)
      .catch((cause: unknown) => {
        setAuthError(reasonOf(cause))
      })
      .finally(() => setLoggingIn(false))
  }

  function logout(): void {
    setLoggingOut(true)
    setLoginNote('')
    setAuthError(null)
    window.desk
      .logout()
      .then((next) => {
        setAuth(next)
        if (next.state === 'signed-in') {
          setAuthError(t`Still signed in. Sign out did not take effect.`)
        }
      })
      .catch((cause: unknown) => setAuthError(reasonOf(cause)))
      .finally(() => setLoggingOut(false))
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
        }
      })
      .catch((cause: unknown) => setAuthError(reasonOf(cause)))
      .finally(() => setInstalling(false))
  }

  return {
    auth,
    authKnown,
    loggingIn,
    loginNote,
    login,
    loggingOut,
    logout,
    installing,
    install,
    authError,
  }
}
