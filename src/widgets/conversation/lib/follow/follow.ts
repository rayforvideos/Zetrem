export function shouldFollow(before: number, now: number, atEnd: boolean): boolean {
  if (now === 0) return false
  if (before === 0) return true
  if (now < before) return true
  return atEnd
}
