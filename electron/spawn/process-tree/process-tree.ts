import type { ProcessRow } from './process-tree.types'

export function parsePsRows(stdout: string): ProcessRow[] {
  const rows: ProcessRow[] = []
  for (const line of stdout.split('\n')) {
    const matched = line.trim().match(/^(\d+)\s+(\d+)$/)
    if (!matched) continue
    rows.push({ pid: Number(matched[1]), ppid: Number(matched[2]) })
  }
  return rows
}

export function descendantsOf(rows: ProcessRow[], rootPid: number): Set<number> {
  const childrenOf = new Map<number, number[]>()
  for (const row of rows) {
    const siblings = childrenOf.get(row.ppid)
    if (siblings) siblings.push(row.pid)
    else childrenOf.set(row.ppid, [row.pid])
  }

  const found = new Set<number>([rootPid])
  const queue = [rootPid]
  while (queue.length > 0) {
    const current = queue.pop()!
    for (const child of childrenOf.get(current) ?? []) {
      if (found.has(child)) continue
      found.add(child)
      queue.push(child)
    }
  }
  return found
}
