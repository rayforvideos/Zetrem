const AGENT = typeof navigator === 'undefined' ? '' : navigator.userAgent

export function isMac(agent: string = AGENT): boolean {
  return /Mac|iPhone|iPad/.test(agent)
}

// Whether this window is the app's own. The renderer also builds for a browser,
// where there is no frame to leave room for: the traffic lights and the Windows
// controls belong to the shell, not to the machine, and asking the machine
// alone leaves a gap in a tab for buttons that are not there.
export function inShell(agent: string = AGENT): boolean {
  return /Electron/.test(agent)
}

export function modifierKey(agent?: string): string {
  return isMac(agent) ? '\u2318' : 'Ctrl'
}
