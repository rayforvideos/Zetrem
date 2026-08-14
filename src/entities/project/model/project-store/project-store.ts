import type { Project } from '../project'

type Listener = () => void

let current: Project | null = null
const listeners = new Set<Listener>()

export const projectStore = {
  get(): Project | null {
    return current
  },
  set(project: Project | null): void {
    current = project
    for (const listener of listeners) listener()
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
