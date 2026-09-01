import { useEffect, useRef } from 'react'
import type { Settings } from '@/entities/settings/model/settings/settings.types'
import { layerOver } from '@/shared/lib/modal/modal'
import { askForStar, starDue } from '@/widgets/star-ask'

// The GitHub star ask: a toast as a reply lands, a few chats in, and again a
// week later until the star is given. The moment it shows is remembered, so
// letting it pass counts as "not now".
export function useStarAsk(
  talking: boolean,
  chats: number,
  settings: Pick<Settings, 'starred' | 'starAskedAtMs'>,
  update: (patch: Partial<Settings>) => void,
): void {
  const wasWorking = useRef(false)
  useEffect(() => {
    // A finished turn leaves the session waiting, or done once it has exited.
    const settled = wasWorking.current && !talking
    wasWorking.current = talking
    if (!settled) return
    const due = starDue({
      chats,
      settled: true,
      starred: settings.starred,
      askedAtMs: settings.starAskedAtMs,
      nowMs: Date.now(),
      layered: layerOver(document),
    })
    if (!due) return
    update({ starAskedAtMs: Date.now() })
    askForStar({ star: () => update({ starred: true }) })
  }, [talking, chats, settings.starred, settings.starAskedAtMs, update])
}
