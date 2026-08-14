import type { Project } from './project'

type Listener = () => void

let current: Project | null = null
const listeners = new Set<Listener>()

/** backdrop-store 와 같은 결 — useSyncExternalStore 가 참조 동일성으로 재렌더를 판정한다 */
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
