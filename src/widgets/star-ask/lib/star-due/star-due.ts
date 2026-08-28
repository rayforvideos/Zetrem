export const STAR_REPO_URL = 'https://github.com/rayforvideos/Zetrem'
const STAR_ASK_AFTER_CHATS = 3
export const STAR_ASK_AGAIN_MS = 7 * 24 * 60 * 60 * 1000

// The ask comes once the app has earned it, a few chats in, right as a reply
// lands, and comes back a week later for as long as the star is not given.
export function starDue(at: {
  chats: number
  settled: boolean
  starred: boolean
  askedAtMs: number | null
  nowMs: number
  layered: boolean
}): boolean {
  if (at.starred || !at.settled || at.layered) return false
  if (at.chats < STAR_ASK_AFTER_CHATS) return false
  return at.askedAtMs === null || at.nowMs - at.askedAtMs >= STAR_ASK_AGAIN_MS
}
