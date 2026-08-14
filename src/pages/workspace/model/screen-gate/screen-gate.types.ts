export type ScreenGate = 'holding' | 'setup' | 'conversation'

export type GateState = {
  settingsLoaded: boolean
  authKnown: boolean
  projectKnown: boolean
  loggedIn: boolean
  hasProject: boolean
  setupDone: boolean
}
