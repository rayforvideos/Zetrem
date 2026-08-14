import { useState } from 'react'
import type { Settings } from '@/entities/agent-session'
import { SIDEBAR } from '@/shared/config/theme'

type Sidebar = {
  width: number
  span: number
  resize(width: number): void
  commit(width: number): void
}

export function useSidebarWidth(
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
): Sidebar {
  const [dragging, setDragging] = useState<number | null>(null)
  const width = dragging ?? settings.sidebarWidth

  function resize(next: number): void {
    setDragging(next)
  }

  function commit(next: number): void {
    setDragging(null)
    update({ sidebarWidth: next })
  }

  return {
    width,
    span: settings.sidebarOpen ? width + SIDEBAR.gap : 0,
    resize,
    commit,
  }
}
