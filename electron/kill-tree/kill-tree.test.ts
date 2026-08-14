import { execFileSync, spawn } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { descendantsOf, parsePsRows } from '@/shared/lib/process-tree/process-tree'
import { killTreeSync } from './kill-tree'

const posix = process.platform !== 'win32'

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('stopping something stops its grandchildren too', () => {
  it.skipIf(!posix)('자식만 죽이면 손자가 남는다 — 트리 전체를 죽인다', async () => {
    const parent = spawn('sh', ['-c', 'sleep 30 & sleep 30 & wait'], { stdio: 'ignore' })
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(parent.pid).toBeDefined()

    const rows = parsePsRows(execFileSync('ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' }))
    const tree = descendantsOf(rows, parent.pid as number)
    expect(tree.size, '부모와 손자 둘이 서야 한다').toBeGreaterThanOrEqual(3)

    killTreeSync(parent.pid as number)
    await new Promise((resolve) => setTimeout(resolve, 500))

    expect([...tree].filter(alive), '트리에 살아남은 것').toEqual([])
  })
})
