import type { Project } from '@/entities/project'

// What switching projects needs from the rest of the workspace: the list to
// fall back on and a way to report trouble. The session rooted in the old
// folder is not touched here: it keeps running under its own chat, and is
// saved there, whichever project the screen shows next.
export type SwitchDeps = {
  project: Project | null
  allProjects: Project[]
  refreshProjects(): void
  report(what: string): (cause: unknown) => void
}

export type ProjectSwitch = {
  pick(): void
  open(id: string): void
  forget(id: string): void
  addDir(): void
  removeDir(path: string): void
}
