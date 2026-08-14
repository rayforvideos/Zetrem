import type { GateState, ScreenGate } from './screen-gate.types'

export function screenGate(state: GateState): ScreenGate {
  if (!state.settingsLoaded || !state.authKnown || !state.projectKnown) return 'holding'
  if (!state.setupDone || !state.loggedIn || !state.hasProject) return 'setup'
  return 'conversation'
}
