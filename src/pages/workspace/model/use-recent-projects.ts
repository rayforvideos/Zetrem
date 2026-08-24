import { useEffect, useState } from 'react'
import type { Project } from '@/entities/project'
import { recentProjects } from '@/entities/project'

/**
 * The folders someone worked in lately, freshest first, without the one they
 * are in. Re-read whenever the project changes, since the change is what
 * rewrites the list.
 */
export function useRecentProjects(current: Project | null): Project[] {
  const [recent, setRecent] = useState<Project[]>([])

  useEffect(() => {
    let alive = true
    recentProjects()
      .then((found) => {
        if (alive) setRecent(found)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [current?.path])

  return recent.filter((one) => one.path !== current?.path)
}
