export type ScreenGate = 'holding' | 'setup' | 'conversation'

export type GateState = {
  settingsLoaded: boolean
  authKnown: boolean
  projectKnown: boolean
  chatKnown: boolean
  loggedIn: boolean
  hasProject: boolean
  setupDone: boolean
  settingsOpen: boolean
}
