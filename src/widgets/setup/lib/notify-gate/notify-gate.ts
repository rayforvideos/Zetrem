import type { NotifyState } from '@/entities/settings/model/notify/notify'

// Only a system-level refusal keeps the switch off: an undecided state is let
// through because macOS asks the user itself on the first notification, and a
// failed read must not lock the user out of their own setting.
export async function notifyAllowed(ask: () => Promise<NotifyState>): Promise<boolean> {
  const state = await ask().catch(() => 'allowed' as const)
  return state !== 'denied'
}
