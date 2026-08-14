import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS } from '@/entities/agent-session'
import type { Settings } from '@/entities/agent-session'
import { useFailure } from '@/shared/lib/failure/failure'
import type { Failure } from '@/shared/lib/failure/failure.types'

type SettingsSource = {
  settings: Settings
  loading: boolean
  failure: Failure | null
  update(patch: Partial<Settings>): void
}

export function useSettings(): SettingsSource {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const { failure, clear, report } = useFailure()

  useEffect(() => {
    window.desk
      .readSettings()
      .then(setSettings)
      .catch(report('Could not read your settings'))
      .finally(() => setLoading(false))
  }, [report])

  const update = useCallback(
    (patch: Partial<Settings>) => {
      clear()
      setSettings((current) => {
        const next = { ...current, ...patch }
        void window.desk.writeSettings(next).catch(report('Could not save your settings'))
        return next
      })
    },
    [clear, report],
  )

  return { settings, loading, failure, update }
}
