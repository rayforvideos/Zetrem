import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent } from 'react'
import { SIDEBAR } from '@/shared/config/theme'
import { draggedWidth, nudgedWidth } from '../../lib/sidebar-width/sidebar-width'

type SidebarGripProps = {
  width: number
  onResize(width: number): void
  onResizeEnd(width: number): void
}

export function SidebarGrip({ width, onResize, onResizeEnd }: SidebarGripProps) {
  const start = useRef<{ x: number; width: number } | null>(null)
  const latest = useRef(width)

  function down(event: ReactPointerEvent<HTMLDivElement>): void {
    start.current = { x: event.clientX, width }
    latest.current = width
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: ReactPointerEvent<HTMLDivElement>): void {
    const from = start.current
    if (from === null) return
    latest.current = draggedWidth(from.width, event.clientX - from.x)
    onResize(latest.current)
  }

  function up(event: ReactPointerEvent<HTMLDivElement>): void {
    if (start.current === null) return
    start.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    onResizeEnd(latest.current)
  }

  function key(event: KeyboardEvent<HTMLDivElement>): void {
    const next = nudgedWidth(width, event.key)
    if (next === null) return
    event.preventDefault()
    onResize(next)
    onResizeEnd(next)
  }

  return (
    <div
      data-grip
      role="separator"
      aria-orientation="vertical"
      aria-label="Team board width"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR.min}
      aria-valuemax={SIDEBAR.max}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      onDoubleClick={() => {
        onResize(SIDEBAR.width)
        onResizeEnd(SIDEBAR.width)
      }}
      title="Drag to resize, double-click to reset"
      className="group/grip absolute inset-y-0 right-0 z-10 flex w-3 cursor-col-resize items-center justify-center focus-visible:outline-none"
    >
      <span className="h-10 w-0.5 rounded-full bg-transparent transition-colors duration-150 group-hover/grip:bg-muted-foreground group-focus-visible/grip:bg-muted-foreground group-active/grip:bg-foreground" />
    </div>
  )
}
