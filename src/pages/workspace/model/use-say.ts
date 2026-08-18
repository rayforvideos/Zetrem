import { useEffect } from 'react'
import { i18n } from '@lingui/core'
import { loadTongue } from '@/shared/lib/say/load'
import { tongueToLoad } from '@/shared/lib/say/say'
import type { Settings } from '@/entities/agent-session'

export function useSay(chosen: Settings['tongue'], settled: boolean): void {
  useEffect(() => {
    const next = tongueToLoad(chosen, settled, i18n.locale, navigator.languages ?? [navigator.language])
    if (next === null) return
    void loadTongue(next)
  }, [chosen, settled])
}
