import { useEffect, useState } from 'react'

export function useAuthoredAgents(project: string | null): string[] {
  const [authored, setAuthored] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    window.desk
      .authoredAgents()
      .then((found) => {
        if (alive) setAuthored(found)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [project])

  return authored
}
