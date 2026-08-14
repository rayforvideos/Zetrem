import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS } from '@/entities/agent-session'
import type { Settings } from '@/entities/agent-session'

type SettingsSource = {
  settings: Settings
  /** 아직 디스크에서 읽는 중 — 이때는 아무 화면도 열지 않는다 */
  loading: boolean
  update(patch: Partial<Settings>): void
}

/**
 * 사람이 고른 것을 읽고 쓴다.
 *
 * 읽는 중에는 화면을 열지 않는다. 기본값으로 먼저 그리면 "시작 안 누른 사람" 으로 보이는
 * 한 프레임이 생기고, 반대로 setupDone 을 참으로 가정하면 고르기도 전에 대화가 열린다.
 */
export function useSettings(): SettingsSource {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.desk
      .readSettings()
      .then(setSettings)
      .catch((cause: unknown) => console.error('설정을 읽지 못했다', cause))
      .finally(() => setLoading(false))
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      // 저장은 뒤따라간다 — 화면이 디스크를 기다릴 이유가 없다
      void window.desk.writeSettings(next).catch((cause: unknown) => {
        console.error('설정을 저장하지 못했다', cause)
      })
      return next
    })
  }, [])

  return { settings, loading, update }
}
