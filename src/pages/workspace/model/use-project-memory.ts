import { useEffect, useState } from 'react'
import { projectStore, restoreProject } from '@/entities/project'

export function useProjectMemory(onTrouble: (cause: unknown) => void): boolean {
  const [known, setKnown] = useState(false)

  useEffect(() => {
    restoreProject()
      .then((restored) => {
        if (restored && projectStore.get() === null) projectStore.set(restored)
      })
      .catch(onTrouble)
      .finally(() => setKnown(true))
  }, [])

  return known
}
