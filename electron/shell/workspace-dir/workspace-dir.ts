import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

// A spawn into a missing cwd fails before the process exists, so everything
// that spawns while no project is picked goes through here.
export function scratchWorkspace(userData: string): string {
  return join(userData, 'agent-workspace')
}

export async function workspaceDir(project: string | null, userData: string): Promise<string> {
  if (project !== null && project.length > 0) return project
  const scratch = scratchWorkspace(userData)
  await mkdir(scratch, { recursive: true }).catch(() => undefined)
  return scratch
}
