import { plural } from '@lingui/core/macro'
import { cn } from '@/shared/lib/cn'
import type { DiffLine } from '../../lib/diff/diff.types'

// This reuses the "{rest, plural, one {# more line} other {# more lines}}"
// message already extracted for the conversation pane's own output cap
// (src/widgets/conversation/lib/limits/limits.ts), rather than duplicating a
// widget import entities is not allowed to make.
function moreLine(rest: number): string {
  return `… ${plural(rest, { one: '# more line', other: '# more lines' })}`
}

export function ChangeDiff({
  groups,
  maxLines,
  className,
}: {
  groups: DiffLine[][]
  maxLines?: number
  className?: string
}) {
  if (groups.length === 0) return null

  const total = groups.reduce((sum, lines) => sum + lines.length, 0)
  const capped = typeof maxLines === 'number' && total > maxLines

  const shown: DiffLine[][] = []
  let remaining = capped ? (maxLines as number) : Number.POSITIVE_INFINITY
  for (const lines of groups) {
    if (remaining <= 0) break
    if (lines.length <= remaining) {
      shown.push(lines)
      remaining -= lines.length
    } else {
      shown.push(lines.slice(0, remaining))
      remaining = 0
    }
  }
  const rest = capped ? total - (maxLines as number) : 0

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {shown.map((lines, index) => (
        <pre
          // biome-ignore lint/suspicious/noArrayIndexKey: the groups are cut out of one diff by position, and have no other name
          key={index}
          data-selectable
          className="zt-scroll max-h-56 overflow-auto rounded-lg bg-card py-1 pr-2.5 font-mono text-xs leading-normal whitespace-pre-wrap"
        >
          {lines.map((line, lineIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: output lines arrive in order and never move
            <div key={lineIndex} className={cn('px-2', TONE[line.kind])}>
              <span className="mr-1.5 inline-block w-[1ch] select-none">{MARK[line.kind]}</span>
              {line.text}
            </div>
          ))}
          {index === shown.length - 1 && rest > 0 && (
            <div data-more className="px-2 text-muted-foreground">
              {moreLine(rest)}
            </div>
          )}
        </pre>
      ))}
      {shown.length === 0 && rest > 0 && (
        <div data-more className="px-2 text-muted-foreground">
          {moreLine(rest)}
        </div>
      )}
    </div>
  )
}

const TONE: Record<DiffLine['kind'], string> = {
  add: 'bg-added-surface text-added',
  remove: 'bg-removed-surface text-removed',
  same: 'text-muted-foreground',
}

const MARK: Record<DiffLine['kind'], string> = {
  add: '+',
  remove: '−',
  same: ' ',
}
