import { execFile, execFileSync } from 'node:child_process'
import { descendantsOf, parsePsRows } from '../process-tree/process-tree'

const isWindows = process.platform === 'win32'

export function killTree(pid: number): void {
  if (isWindows) {
    execFile('taskkill', ['/pid', String(pid), '/T', '/F'], () => undefined)
    return
  }
  for (const target of treeOf(pid)) {
    try {
      process.kill(target, 'SIGTERM')
    } catch {
      continue
    }
  }
}

export function killTreeSync(pid: number): void {
  if (isWindows) {
    try {
      execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
    } catch {
      // taskkill exits non-zero when the process is already gone.
    }
    return
  }
  for (const target of treeOf(pid)) {
    try {
      process.kill(target, 'SIGKILL')
    } catch {
      continue
    }
  }
}

function treeOf(pid: number): number[] {
  try {
    const stdout = execFileSync('ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' })
    const found = [...descendantsOf(parsePsRows(stdout), pid)]
    return found.sort((a, b) => b - a)
  } catch {
    return [pid]
  }
}
