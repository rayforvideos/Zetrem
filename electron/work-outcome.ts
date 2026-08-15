import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { branchOf, copyNameOf, outcomeOf } from '@/entities/agent-session'
import type { WorkOutcome } from '@/entities/agent-session'
import { recallProject } from './project-memory'
import { handle } from './ipc/ipc'

const execFileAsync = promisify(execFile)
const GIT_TIMEOUT_MS = 5000

function safeTaskId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null
}

async function git(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd, timeout: GIT_TIMEOUT_MS })
    return stdout
  } catch {
    return ''
  }
}

export function registerWorkOutcome(): void {
  handle('outcome:read', async (_event, task: unknown): Promise<WorkOutcome | null> => {
    const taskId = safeTaskId(task)
    if (taskId === null) return null

    const project = await recallProject()
    if (project === null) return null

    const copy = join(project, '.claude', 'worktrees', copyNameOf(taskId))
    if (!existsSync(copy)) return null

    const here = (await git(project, ['rev-parse', 'HEAD'])).trim()
    if (here.length === 0) return null

    const [counted, dirty] = await Promise.all([
      git(copy, ['rev-list', '--count', 'HEAD', `^${here}`]),
      git(copy, ['status', '--porcelain']),
    ])
    return { branch: branchOf(taskId), ...outcomeOf(counted, dirty) }
  })
}
