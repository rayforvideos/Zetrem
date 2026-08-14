function parse(version: string): number[] | null {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => Number.isNaN(part))) return null
  return parts
}

export function isOutdated(current: string | null, latest: string | null): boolean {
  if (current === null || latest === null) return false
  const a = parse(current)
  const b = parse(latest)
  if (a === null || b === null) return false
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x < y
  }
  return false
}

export function managerOf(binaryPath: string): string | null {
  if (binaryPath.includes('/Caskroom/')) return 'Homebrew'
  if (binaryPath.includes('/node_modules/')) return 'npm'
  return null
}
