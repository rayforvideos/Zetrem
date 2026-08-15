import { useEffect, useRef, useState } from 'react'
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
  const held = useRef(settings)

  function hold(next: Settings): void {
    held.current = next
    setSettings(next)
  }

  useEffect(() => {
    window.desk
      .readSettings()
      .then(hold)
      .catch(report('Could not read your settings'))
      .finally(() => setLoading(false))
  }, [report])

  function update(patch: Partial<Settings>): void {
    clear()
    const next = { ...held.current, ...patch }
    hold(next)
    void window.desk.writeSettings(next).catch(report('Could not save your settings'))
  }

  return { settings, loading, failure, update }
}
