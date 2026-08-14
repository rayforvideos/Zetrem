import type { CSSProperties } from 'react'
import { tally } from '@/shared/lib/tool-line'
import { ToolIcon } from '@/shared/ui/tool-icon'
import type { ToolShape } from '@/shared/lib/tool-shape'

const SHAPES: { key: keyof ReturnType<typeof tally>; shape: ToolShape; word: string }[] = [
  { key: 'read', shape: { kind: 'file', verb: 'read', dir: '', name: '' }, word: 'Read' },
  { key: 'wrote', shape: { kind: 'file', verb: 'edit', dir: '', name: '' }, word: 'Edited' },
  { key: 'ran', shape: { kind: 'command', command: '' }, word: 'Ran' },
  { key: 'searched', shape: { kind: 'search', pattern: '', scope: '' }, word: 'Searched' },
]

export function Tally({ lines }: { lines: string[] }) {
  const counted = tally(lines)
  const done = SHAPES.filter((entry) => counted[entry.key] > 0)
  if (done.length === 0) return null

  return (
    <div data-tally style={rootStyle}>
      {done.map((entry) => (
        <span key={entry.key} style={itemStyle} title={entry.word}>
          <ToolIcon shape={entry.shape} />
          {counted[entry.key]}
        </span>
      ))}
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  marginTop: 10,
  display: 'flex',
  gap: 12,
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.75,
}

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}
