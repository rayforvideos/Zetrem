import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, readSettings } from '@/entities/settings'
import type { Settings } from '@/entities/settings'
import { useFailure } from '@/shared/lib/failure/failure'
import { onRead, onUpdate } from './settings-writes/settings-writes'
import type { Failure } from '@/shared/lib/failure/failure.types'
import { t } from '@lingui/core/macro'

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
  const read = useRef(false)
  const waiting = useRef<Partial<Settings>>({})

  const hold = useCallback((next: Settings): void => {
    held.current = next
    setSettings(next)
  }, [])

  useEffect(() => {
    const save = report(t`Could not save your settings`)
    window.desk
      .readSettings()
      .then((saved) => {
        const landed = onRead(readSettings(saved), waiting.current)
        waiting.current = {}
        read.current = true
        hold(landed.next)
        if (landed.save) void window.desk.writeSettings(landed.next).catch(save)
      })
      .catch((cause: unknown) => {
        read.current = true
        report(t`Could not read your settings`)(cause)
      })
      .finally(() => setLoading(false))
  }, [report, hold])

  const update = useCallback(
    (patch: Partial<Settings>): void => {
      clear()
      const step = onUpdate(held.current, patch, read.current, waiting.current)
      waiting.current = step.waiting
      hold(step.next)
      if (step.save)
        void window.desk.writeSettings(step.next).catch(report(t`Could not save your settings`))
    },
    [clear, report, hold],
  )

  return { settings, loading, failure, update }
}
