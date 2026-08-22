import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

// Where a claude run happens while no project is picked. Everything that
// spawns has to go through here: the folder is only there because we made it,
// and a spawn into a missing cwd fails before the process exists — which is
// how a fresh install used to learn no agent roster at all.
export function scratchWorkspace(userData: string): string {
  return join(userData, 'agent-workspace')
}

export async function workspaceDir(project: string | null, userData: string): Promise<string> {
  if (project !== null && project.length > 0) return project
  const scratch = scratchWorkspace(userData)
  await mkdir(scratch, { recursive: true }).catch(() => undefined)
  return scratch
}
