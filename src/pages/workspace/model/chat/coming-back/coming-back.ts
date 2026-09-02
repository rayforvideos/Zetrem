// Which chat a project opens on. A rebuilt screen (a language change) must
// come back to the chat that was being read: chats replying in the background
// save too, so the newest file on disk is not the chat anybody was in.
export function comingBackTo(
  found: readonly { id: string }[],
  wanted: string | null,
  stillHeld: boolean,
): string | null {
  if (wanted !== null && (stillHeld || found.some((one) => one.id === wanted))) return wanted
  return found[0]?.id ?? null
}
