import type { Tongue } from './say.types'

const KNOWN: Tongue[] = ['en', 'ko']

export function tongueOf(locales: readonly string[]): Tongue {
  const found = locales
    .map((one) => one.toLowerCase().split('-')[0])
    .find((one) => KNOWN.includes(one as Tongue))
  return (found as Tongue | undefined) ?? 'en'
}

export function localeOf(tongue: Tongue): string {
  return tongue === 'ko' ? 'ko-KR' : 'en-US'
}

export function chosenTongue(chosen: 'system' | Tongue, locales: readonly string[]): Tongue {
  return chosen === 'system' ? tongueOf(locales) : chosen
}

const listeners = new Set<() => void>()

export function watchTongue(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function tongueChanged(): void {
  for (const listener of listeners) listener()
}

export function tongueToLoad(
  chosen: 'system' | Tongue,
  settled: boolean,
  active: string,
  locales: readonly string[],
): Tongue | null {
  if (!settled) return null
  const next = chosenTongue(chosen, locales)
  return next === active ? null : next
}
