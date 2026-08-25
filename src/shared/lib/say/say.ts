import type { Tongue } from './say.types'

const KNOWN: Tongue[] = ['en', 'ko']

function isTongue(value: string | undefined): value is Tongue {
  return value !== undefined && KNOWN.includes(value as Tongue)
}

export function tongueOf(locales: readonly string[]): Tongue {
  return locales.map((one) => one.toLowerCase().split('-')[0]).find(isTongue) ?? 'en'
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
