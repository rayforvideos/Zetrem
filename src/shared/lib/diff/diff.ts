import type { DiffRow, DiffTone } from './diff.types'

const HEADERS = ['diff --git', 'index ', '@@', 'new file', 'deleted file', 'similarity', 'rename ']

function toneOf(line: string): DiffTone {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta'
  if (HEADERS.some((head) => line.startsWith(head))) return 'meta'
  if (line.startsWith('+')) return 'added'
  if (line.startsWith('-')) return 'removed'
  return 'plain'
}

export function diffRows(diff: string): DiffRow[] {
  const lines = diff.split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines.map((text, at) => ({ key: `${at}`, text, tone: toneOf(text) }))
}
