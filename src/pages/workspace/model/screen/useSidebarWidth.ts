import { useEffect, useState } from 'react'
import type { Settings } from '@/entities/settings'
import { SIDEBAR } from '@/shared/config/theme'
import { sidebarFits, sidebarFloats, sidebarShows, sidebarSpan } from './sidebar-room/sidebar-room'

type Sidebar = {
  width: number
  span: number
  open: boolean
  tight: boolean
  // Open where it does not fit: shown over the conversation, taking no room from it.
  floating: boolean
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
    span: sidebarSpan(open, fits, width, SIDEBAR.gap),
    open,
    tight: !fits,
    floating: sidebarFloats(open, fits),
    toggle,
    resize: setDragging,
    commit,
  }
}
