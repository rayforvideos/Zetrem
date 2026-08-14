const AGENT = typeof navigator === 'undefined' ? '' : navigator.userAgent

export function isMac(agent: string = AGENT): boolean {
  return /Mac|iPhone|iPad/.test(agent)
}

export function modifierKey(agent?: string): string {
  return isMac(agent) ? '\u2318' : 'Ctrl'
}
