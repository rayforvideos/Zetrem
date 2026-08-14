import { useCallback, useEffect, useState } from 'react'
import type { AuthStatus } from '@/shared/api/desk'

type Auth = {
  /** 아직 물어보는 중이면 null */
  auth: AuthStatus | null
  /**
   * 물어본 답이 왔는가. 실패로 왔어도 참이다.
   *
   * `auth === null` 로는 "아직 모른다" 와 "물었더니 안 됐다" 를 가를 수 없다. 그 둘을
   * 뭉개면 이미 로그인한 사람에게도 설정 화면이 한 번 번쩍인다 (screen-gate.ts 참고)
   */
  authKnown: boolean
  loggingIn: boolean
  /** 로그인 중 CLI 가 낸 마지막 안내 — 브라우저가 안 열릴 때 붙일 URL 이 여기 온다 */
  loginNote: string
  login(): void
}

/** URL 만 뽑는다 — CLI 안내문 전체를 화면에 붙이면 우리 화면이 아니라 남의 로그가 된다 */
const URL_PATTERN = /https?:\/\/\S+/

/**
 * 로그인 상태를 묻고, 필요하면 CLI 의 로그인 흐름을 띄운다.
 * 자격 증명은 CLI 의 것이다 — 이 앱은 상태만 안다.
 */
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
      // 실패해도 "알았다" 로 친다 — 아니면 화면이 영영 기다린다
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
