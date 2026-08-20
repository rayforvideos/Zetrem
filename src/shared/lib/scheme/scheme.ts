const QUERY = '(prefers-color-scheme: dark)'

export function darkScheme(): boolean {
  return typeof matchMedia === 'function' && matchMedia(QUERY).matches
}

export function watchScheme(listener: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => undefined
  const mql = matchMedia(QUERY)
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}
