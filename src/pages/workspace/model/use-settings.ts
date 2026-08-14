import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS } from '@/entities/agent-session'
import type { Settings } from '@/entities/agent-session'

type SettingsSource = {
  settings: Settings
  loading: boolean
  update(patch: Partial<Settings>): void
}

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
      void window.desk.writeSettings(next).catch((cause: unknown) => {
        console.error('설정을 저장하지 못했다', cause)
      })
      return next
    })
  }, [])

  return { settings, loading, update }
}
