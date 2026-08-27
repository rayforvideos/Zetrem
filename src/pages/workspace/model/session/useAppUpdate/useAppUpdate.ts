import { createElement } from 'react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { UpdateCard } from '../../../ui/UpdateCard/UpdateCard'

// The update installs on restart either way (main sets autoInstallOnAppQuit),
// so "Later" only puts the card away.
export function useAppUpdate(): void {
  const shown = useRef<string | null>(null)
  const card = useRef<string | number | null>(null)

  useEffect(() => {
    const offer = (version: string): void => {
      if (version === shown.current) return
      shown.current = version
      // A session can outlive two releases, and restarting installs only the
      // newest, so the older card is untrue once a newer one exists.
      if (card.current !== null) toast.dismiss(card.current)
      const id = toast.custom(
        () =>
          createElement(UpdateCard, {
            version,
            onRestart: () => void window.desk.updaterRestart(),
            onLater: () => toast.dismiss(id),
          }),
        { duration: Infinity },
      )
      card.current = id
    }

    void window.desk
      .updaterState()
      .then((version) => {
        if (version !== null) offer(version)
      })
      .catch(() => undefined)
    return window.desk.onUpdaterReady(offer)
  }, [])
}
