import { createElement } from 'react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { UpdateCard } from '../../ui/UpdateCard/UpdateCard'

/**
 * Surfaces a downloaded app update as a card in the toast corner. The update
 * installs on restart either way (main sets autoInstallOnAppQuit), so "Later"
 * only puts the card away.
 */
export function useAppUpdate(): void {
  const shown = useRef<string | null>(null)

  useEffect(() => {
    const offer = (version: string): void => {
      if (version === shown.current) return
      shown.current = version
      const id = toast.custom(
        () =>
          createElement(UpdateCard, {
            version,
            onRestart: () => void window.desk.updaterRestart(),
            onLater: () => toast.dismiss(id),
          }),
        { duration: Infinity },
      )
    }

    // The download usually finishes long after mount, but a reload (or a
    // dismissed renderer) would miss the push, so the stored state is asked
    // for once as well.
    void window.desk
      .updaterState()
      .then((version) => {
        if (version !== null) offer(version)
      })
      .catch(() => undefined)
    return window.desk.onUpdaterReady(offer)
  }, [])
}
