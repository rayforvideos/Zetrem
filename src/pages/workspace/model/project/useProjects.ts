import { useEffect, useRef, useState } from 'react'
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
  // Opening, creating and forgetting all ask for the list, so several reads
  // can be in flight at once. Only the newest one may land.
  const ticket = useRef(0)

  function refresh(): void {
    const mine = ++ticket.current
    listProjects()
      .then((found) => {
        if (ticket.current === mine) setAll(found)
      })
      .catch((cause: unknown) => {
        console.error('[zetrem] could not list your projects', cause)
      })
  }

  useEffect(refresh, [current?.id])

  return { all, refresh }
}
