import { useEffect, useState } from 'react'
import type { Settings } from '@/entities/agent-session'
import { SIDEBAR } from '@/shared/config/theme'
import { sidebarFits, sidebarShows } from './sidebar-room/sidebar-room'

type Sidebar = {
  width: number
  span: number
  open: boolean
  tight: boolean
  toggle(): void
  resize(width: number): void
  commit(width: number): void
}

export function useSidebarWidth(
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
  viewportW: number,
): Sidebar {
  const [dragging, setDragging] = useState<number | null>(null)
  const [forced, setForced] = useState(false)
  const width = dragging ?? settings.sidebarWidth
  const fits = sidebarFits(viewportW, width + SIDEBAR.gap)
  const open = sidebarShows(settings.sidebarOpen, forced, fits)

  useEffect(() => {
    if (fits) setForced(false)
  }, [fits])

  function toggle(): void {
    if (fits) {
      update({ sidebarOpen: !settings.sidebarOpen })
      return
    }
    setForced(!forced)
    update({ sidebarOpen: !forced })
  }

  function commit(next: number): void {
    setDragging(null)
    update({ sidebarWidth: next })
  }

  return {
    width,
    span: open ? width + SIDEBAR.gap : 0,
    open,
    tight: !fits,
    toggle,
    resize: setDragging,
    commit,
  }
}
