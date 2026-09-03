import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { projectKey } from '../../store/project-key/project-key'

// Every project's own teammates live in one folder of the app's, each project
// in a drawer named by a hash of its path. Two places need that folder: the
// roster that reads and writes people, and this module, which keeps the
// drawers in step when a project moves house or is forgotten.
export function projectAgentsRoot(): string {
  return join(app.getPath('userData'), 'project-agents')
}

function drawer(root: string, path: string): string {
  return join(root, projectKey(path))
}

// The name of a file as the filesystem a person is on would compare it: macOS
// and Windows would let a rename of Ray.md quietly replace an existing ray.md,
// and the roster already reads those two as the same person.
function nameKey(name: string): string {
  return name.toLowerCase()
}

// A project repathed onto the folder it was moved to keeps its people: the old
// drawer's contents are carried over to the new one. The same folder can have
// been registered twice under two paths, so the new drawer may already hold
// people of its own. Those stay as they are, since they are the ones the
// project has been working with; only what has no counterpart there is carried
// across, and the emptied drawer goes.
export async function moveProjectAgents(
  fromPath: string,
  toPath: string,
  root: string = projectAgentsRoot(),
): Promise<void> {
  const from = drawer(root, fromPath)
  const to = drawer(root, toPath)
  if (from === to) return
  let names: string[]
  try {
    names = await readdir(from)
  } catch {
    // No drawer to move: the project never kept anyone of its own.
    return
  }
  await mkdir(to, { recursive: true })
  const taken = new Set((await readdir(to)).map(nameKey))
  for (const name of names) {
    if (taken.has(nameKey(name))) continue
    await rename(join(from, name), join(to, name))
  }
  await rm(from, { recursive: true, force: true })
}

// A forgotten project leaves nothing of the app's behind. Its people were only
// ever kept for it, and a drawer nothing points at any more would sit in
// userData for good, so it goes with the project.
export async function dropProjectAgents(
  path: string,
  root: string = projectAgentsRoot(),
): Promise<void> {
  await rm(drawer(root, path), { recursive: true, force: true })
}
