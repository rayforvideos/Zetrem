import { useCallback, useEffect, useState } from 'react'
import type { AuthStatus } from '@/shared/api/desk'

type Auth = {
  auth: AuthStatus | null
  authKnown: boolean
  loggingIn: boolean
  loginNote: string
  login(): void
  loggingOut: boolean
  logout(): void
  authError: string | null
}

const URL_PATTERN = /https?:\/\/\S+/

export function useAuth(): Auth {
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [authKnown, setAuthKnown] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginNote, setLoginNote] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    window.desk
      .authStatus()
      .then(setAuth)
      .catch((cause: unknown) => console.error('could not read sign-in status', cause))
      .finally(() => setAuthKnown(true))
  }, [])

  useEffect(() => {
    return window.desk.onAuthProgress((line) => {
      const url = line.match(URL_PATTERN)
      if (url) setLoginNote(url[0])
    })
  }, [])

  const login = useCallback(() => {
    setLoggingIn(true)
    setLoginNote('')
    window.desk
      .login()
      .then(setAuth)
      .catch((cause: unknown) => console.error('sign-in failed', cause))
      .finally(() => setLoggingIn(false))
  }, [])

  const logout = useCallback(() => {
    setLoggingOut(true)
    setLoginNote('')
    setAuthError(null)
    window.desk
      .logout()
      .then((next) => {
        setAuth(next)
        if (next.loggedIn) setAuthError('Still signed in — sign out did not take effect.')
      })
      .catch((cause: unknown) => {
        const text = cause instanceof Error ? cause.message : String(cause)
        setAuthError(text.replace(/^Error invoking remote method '[^']*':\s*/, ''))
      })
      .finally(() => setLoggingOut(false))
  }, [])

  return { auth, authKnown, loggingIn, loginNote, login, loggingOut, logout, authError }
}
