import type { DiffLine } from './diff.types'

const CONTEXT = 3

export function lineDiff(before: string, after: string, context = CONTEXT): DiffLine[] {
  if (before.length === 0 && after.length === 0) return []
  const a = before.length === 0 ? [] : before.split('\n')
  const b = after.length === 0 ? [] : after.split('\n')

  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1

  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail += 1
  }

  const out: DiffLine[] = []
  const headShown = Math.min(head, context)
  if (head > headShown) out.push({ kind: 'same', text: '…' })
  for (const text of a.slice(head - headShown, head)) out.push({ kind: 'same', text })

  for (const text of a.slice(head, a.length - tail)) out.push({ kind: 'remove', text })
  for (const text of b.slice(head, b.length - tail)) out.push({ kind: 'add', text })

  const tailShown = Math.min(tail, context)
  for (const text of a.slice(a.length - tail, a.length - tail + tailShown)) {
    out.push({ kind: 'same', text })
  }
  if (tail > tailShown) out.push({ kind: 'same', text: '…' })

  return out
}
