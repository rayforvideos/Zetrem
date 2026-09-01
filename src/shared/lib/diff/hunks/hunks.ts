import type { Hunk, HunkLine } from './hunks.types'

const HEAD = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

// A unified diff into hunks the pane can draw with line numbers: the file
// header lines (diff --git, index, ---, +++) carry nothing the pane shows.
// A body with no @@ header at all (a synthesized untracked-file diff) reads
// as one hunk counting from line one.
export function diffHunks(diff: string): Hunk[] {
  const hunks: Hunk[] = []
  let oldNo = 1
  let newNo = 1
  let open: Hunk | null = null

  const lines = diff.split('\n')
  if (lines.at(-1) === '') lines.pop()

  for (const line of lines) {
    const head = HEAD.exec(line)
    if (head !== null) {
      oldNo = Number(head[1])
      newNo = Number(head[2])
      open = { header: line, lines: [] }
      hunks.push(open)
      continue
    }
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('new file') ||
      line.startsWith('deleted file') ||
      line.startsWith('similarity') ||
      line.startsWith('rename ') ||
      line.startsWith('Binary files') ||
      line.startsWith('\\')
    )
      continue

    let row: HunkLine
    if (line.startsWith('+'))
      row = { kind: 'added', oldNo: null, newNo: newNo++, text: line.slice(1) }
    else if (line.startsWith('-'))
      row = { kind: 'removed', oldNo: oldNo++, newNo: null, text: line.slice(1) }
    else row = { kind: 'plain', oldNo: oldNo++, newNo: newNo++, text: line.slice(1) }

    if (open === null) {
      open = { header: '', lines: [] }
      hunks.push(open)
    }
    open.lines.push(row)
  }
  return hunks
}
