import { useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'

// Whether this project's sessions are handed the library: one switch per
// project, read again on every switch so one project's choice never shows on
// another. A running session keeps what it was given; the change lands on the
// next one, and the toast says so when there is one running.
export function useLibraryAccess(project: string | null, sessionLive: boolean) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    let stale = false
    window.desk
      .libraryOpenToAgents()
      .then((now) => {
        if (!stale) setOpen(now)
      })
      .catch(() => undefined)
    return () => {
      stale = true
    }
  }, [project])

  const set = useCallback(
    (next: boolean): void => {
      setOpen(next)
      window.desk
        .setLibraryOpenToAgents(next)
        .then((now) => {
          setOpen(now)
          if (!sessionLive) return
          toast(
            next
              ? t`The running session goes on without the library. Agents read it from the next one.`
              : t`The running session keeps the library. Agents stop seeing it from the next one.`,
          )
        })
        .catch(() => setOpen(!next))
    },
    [sessionLive],
  )

  return { open, set }
}
