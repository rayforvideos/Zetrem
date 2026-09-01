import type { Project } from '@/entities/project'

// What switching projects needs from the rest of the workspace: the list to
// fall back on, a way to report trouble, and the teardown of whatever the
// old project still runs.
export type SwitchDeps = {
  project: Project | null
  allProjects: Project[]
  refreshProjects(): void
  report(what: string): (cause: unknown) => void
  dropSession(): void
}

export type ProjectSwitch = {
  pick(): void
  open(id: string): void
  forget(id: string): void
}
