import { useEffect, useState } from 'react'
import type { Project } from '@/entities/project'
import { listProjects } from '@/entities/project'

/**
 * Every project there is, freshest first. Re-read when the current one
 * changes, since opening and creating are what reorder the list.
 */
export function useProjects(current: Project | null): {
  all: Project[]
  refresh(): void
} {
  const [all, setAll] = useState<Project[]>([])

  function refresh(): void {
    listProjects()
      .then(setAll)
      .catch(() => undefined)
  }

  useEffect(refresh, [current?.id])

  return { all, refresh }
}
