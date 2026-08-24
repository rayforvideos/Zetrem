type Press = { key: string; mod: boolean }

// The modifier with a digit addresses the teammate wearing that number in the
// sidebar; 0 takes the address away. Plain digits stay typing.
export function addressKey(press: Press, count: number): number | 'clear' | null {
  if (!press.mod) return null
  if (press.key === '0') return 'clear'
  if (!/^[1-9]$/.test(press.key)) return null
  const index = Number.parseInt(press.key, 10) - 1
  return index < count ? index : null
}
