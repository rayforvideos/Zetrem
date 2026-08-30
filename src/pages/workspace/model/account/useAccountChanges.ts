import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Settings } from '@/entities/settings'
import { accountChanges, subscribeAccountChange } from './account-change/account-change'
import { forgottenOnAccountChange } from './forgotten-settings/forgotten-settings'

// The number rises every time the signed-in account moves. A hook that takes
// it as a dependency asks its question again, the way it already does when
// the project changes. On the way past, the settings that describe the
// account rather than the person are dropped.
export function useAccountChanges(
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
): number {
  const changes = useSyncExternalStore(subscribeAccountChange, accountChanges, accountChanges)
  const held = useRef(settings)
  useEffect(() => {
    held.current = settings
  })

  const seen = useRef(changes)
  useEffect(() => {
    if (seen.current === changes) return
    seen.current = changes
    const patch = forgottenOnAccountChange(held.current)
    if (patch !== null) update(patch)
  }, [changes, update])

  return changes
}
