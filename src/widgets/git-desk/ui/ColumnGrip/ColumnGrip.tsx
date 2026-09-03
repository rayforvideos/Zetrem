import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { t } from '@lingui/core/macro'
import { GIT_COLUMNS } from '@/shared/config/theme'
import { cn } from '@/shared/lib/cn'
import { columnPull, draggedColumn, nudgedColumn } from '../../lib/columns/columns'
import type { GitColumnName } from '../../lib/columns/columns.types'

type ColumnGripProps = {
  name: GitColumnName
  label: string
  width: number
  onResize(name: GitColumnName, px: number): void
  onCommit(name: GitColumnName, px: number): void
  onReset(name: GitColumnName): void
}

// The divider between two column heads, taken hold of. It fills the gap it sits
// in rather than the head's own edge, so the target is the seam a person aims at.
export function ColumnGrip({ name, label, width, onResize, onCommit, onReset }: ColumnGripProps) {
  const start = useRef<{ x: number; width: number } | null>(null)
  const latest = useRef(width)
  const bounds = GIT_COLUMNS[name]

  function down(event: ReactPointerEvent<HTMLDivElement>): void {
    start.current = { x: event.clientX, width }
    latest.current = width
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: ReactPointerEvent<HTMLDivElement>): void {
    const from = start.current
    if (from === null) return
    latest.current = draggedColumn(name, from.width, event.clientX - from.x)
    onResize(name, latest.current)
  }

  function up(event: ReactPointerEvent<HTMLDivElement>): void {
    const from = start.current
    if (from === null) return
    start.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    // The two presses of a double click each land here first; saving a width that
    // never moved would race the reset that follows with a write of the old one.
    if (latest.current !== from.width) onCommit(name, latest.current)
  }

  function key(event: KeyboardEvent<HTMLDivElement>): void {
    const next = nudgedColumn(name, width, event.key)
    if (next === null) return
    event.preventDefault()
    onResize(name, next)
    onCommit(name, next)
  }

  return (
    <div
      data-git-grip={name}
      role="separator"
      aria-orientation="vertical"
      aria-label={t`${label} column width`}
      aria-valuenow={width}
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      onDoubleClick={() => onReset(name)}
      title={t`Drag to resize, double-click to reset`}
      className={cn(
        'group/grip absolute z-10 flex w-3 cursor-col-resize items-center justify-center focus-visible:outline-none',
        // The head is one line of small type, so the grip reaches out past it to
        // give the pointer the whole height of the header row to land on.
        '-inset-y-1.5',
        columnPull(name) === 1 ? '-right-3' : '-left-3',
      )}
    >
      <span className="h-3.5 w-0.5 rounded-full bg-transparent transition-colors duration-150 group-hover/grip:bg-muted-foreground group-focus-visible/grip:bg-muted-foreground group-active/grip:bg-foreground" />
    </div>
  )
}
