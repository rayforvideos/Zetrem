import { useRef, useState } from 'react'
import type { Settings } from '@/entities/agent-session'

type Panel = {
  open: boolean
  show(): void
  start(): void
  cancel(): void
}

export function useSettingsPanel(
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
): Panel {
  const [open, setOpen] = useState(false)
  const undo = useRef<Settings | null>(null)

  function show(): void {
    undo.current = settings
    setOpen(true)
  }

  function start(): void {
    undo.current = null
    setOpen(false)
    update({ setupDone: true })
  }

  function cancel(): void {
    const snapshot = undo.current
    undo.current = null
    setOpen(false)
    if (snapshot !== null) update(snapshot)
  }

  return { open, show, start, cancel }
}
