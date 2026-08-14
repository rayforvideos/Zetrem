import { useCallback, useEffect, useState } from 'react'
import type { AuthStatus } from '@/entities/auth'
import { urlFrom } from '@/shared/lib/cli-output/cli-output'
import { reasonOf } from '@/shared/lib/failure/failure'

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

const CHUNK_MEMORY = 8000

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
    let seen = ''
    return window.desk.onAuthProgress((chunk) => {
      seen = `${seen}${chunk}`.slice(-CHUNK_MEMORY)
      const url = urlFrom(seen)
      if (url !== null) setLoginNote(url)
    })
  }, [])

  const login = useCallback(() => {
    setLoggingIn(true)
    setLoginNote('')
    window.desk
      .login()
      .then(setAuth)
      .catch((cause: unknown) => {
        setAuthError(reasonOf(cause))
      })
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
        if (next.state === 'signed-in') {
          setAuthError('Still signed in — sign out did not take effect.')
        }
      })
      .catch((cause: unknown) => setAuthError(reasonOf(cause)))
      .finally(() => setLoggingOut(false))
  }, [])

  return { auth, authKnown, loggingIn, loginNote, login, loggingOut, logout, authError }
}
