// Whether the turns on screen are a different chat's, rather than the same
// chat with turns added to it. A chat only ever grows at its end, so the
// first turn is the one that names it. Nothing before, or nothing now, is a
// chat opening or closing, not a swap.
export function swapped(beforeFirst: string | null, nowFirst: string | null): boolean {
  return beforeFirst !== null && nowFirst !== null && beforeFirst !== nowFirst
}

export function shouldFollow(
  before: number,
  now: number,
  atEnd: boolean,
  swapped = false,
): boolean {
  if (now === 0) return false
  if (before === 0) return true
  if (now < before) return true
  // Where the reader had scrolled to in the chat they left says nothing
  // about where they want to be in the one they came back to.
  if (swapped) return true
  return atEnd
}
