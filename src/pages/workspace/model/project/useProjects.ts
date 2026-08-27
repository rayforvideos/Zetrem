import { useEffect, useRef, useState } from 'react'
import type { Project } from '@/entities/project'
import { listProjects } from '@/entities/project'

export function useProjects(current: Project | null): {
  all: Project[]
  refresh(): void
} {
  const [all, setAll] = useState<Project[]>([])
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
