const ELLIPSIS = '…'

export function clip(text: string, max: number): string {
  const tidy = text.trim()
  if (tidy.length <= max) return tidy
  const cut = tidy.slice(0, max)
  const whole = /\s/.test(tidy[max] ?? '')
  const space = cut.lastIndexOf(' ')
  const kept = whole || space <= max * 0.6 ? cut : cut.slice(0, space)
  return `${kept.replace(/[\s,.;:]+$/, '')}${ELLIPSIS}`
}
