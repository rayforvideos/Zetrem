export type ScreenGate = 'holding' | 'welcome' | 'setup' | 'conversation'

export type GateState = {
  settingsLoaded: boolean
  authKnown: boolean
  projectKnown: boolean
  chatKnown: boolean
  loggedIn: boolean
  hasProject: boolean
  setupDone: boolean
  onboarded: boolean
  settingsOpen: boolean
}
