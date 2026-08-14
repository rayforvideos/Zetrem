import { useCallback, useEffect, useState } from 'react'
import type { AuthStatus } from '@/shared/api/desk'

type Auth = {
  auth: AuthStatus | null
  authKnown: boolean
  loggingIn: boolean
  loginNote: string
  login(): void
}

const URL_PATTERN = /https?:\/\/\S+/

export function useAuth(): Auth {
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [authKnown, setAuthKnown] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginNote, setLoginNote] = useState('')

  useEffect(() => {
    window.desk
      .authStatus()
      .then(setAuth)
      .catch((cause: unknown) => console.error('로그인 상태를 묻지 못했다', cause))
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
      .catch((cause: unknown) => console.error('로그인하지 못했다', cause))
      .finally(() => setLoggingIn(false))
  }, [])

  return { auth, authKnown, loggingIn, loginNote, login }
}
