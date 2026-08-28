import { useEffect, useState, useCallback, useRef } from 'react'
import type { AuthStatus } from '@/entities/auth'
import { urlFrom } from '@/entities/claude-cli/lib/cli-output/cli-output'
import { reasonOf } from '@/shared/lib/failure/failure'
import { lastLine, troubleLine } from '@/shared/lib/ask/ask'
import { t } from '@lingui/core/macro'

type Auth = {
  auth: AuthStatus | null
  authKnown: boolean
  recheck(): void
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

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const recheck = useCallback((): void => {
    setAuthError(null)
    window.desk
      .authStatus()
      .then((status) => {
        if (alive.current) setAuth(status)
      })
      .catch((cause: unknown) => {
        if (alive.current) setAuthError(troubleLine(t`Could not read your sign-in`, cause))
      })
      .finally(() => {
        if (alive.current) setAuthKnown(true)
      })
  }, [])

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
      .then((result) => {
        if (!result.ok) {
          setAuthError(lastLine(result.why.said, t`Sign out did not take effect.`))
          return
        }
        setAuth(result.value)
        if (result.value.state === 'signed-in') {
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
    recheck,
    authError,
  }
}
