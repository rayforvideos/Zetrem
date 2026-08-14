export type ScreenGate = 'holding' | 'setup' | 'conversation'

export type GateState = {
  settingsLoaded: boolean
  authKnown: boolean
  projectKnown: boolean
  loggedIn: boolean
  hasProject: boolean
  setupDone: boolean
}

export function screenGate(state: GateState): ScreenGate {
  if (!state.settingsLoaded || !state.authKnown || !state.projectKnown) return 'holding'
  if (!state.setupDone || !state.loggedIn || !state.hasProject) return 'setup'
  return 'conversation'
}
