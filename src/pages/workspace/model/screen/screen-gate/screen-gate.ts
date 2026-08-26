import type { GateState, ScreenGate } from './screen-gate.types'

export function screenGate(state: GateState): ScreenGate {
  if (!state.settingsLoaded || !state.authKnown || !state.projectKnown) return 'holding'
  if (state.settingsOpen) return 'setup'
  if (!state.onboarded) return 'welcome'
  if (!state.setupDone || !state.loggedIn || !state.hasProject) return 'setup'
  if (!state.chatKnown) return 'holding'
  return 'conversation'
}
