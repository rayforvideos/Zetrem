import { describe, expect, it } from 'vitest'
import { screenGate } from './screen-gate'

const known = {
  settingsLoaded: true,
  authKnown: true,
  projectKnown: true,
  chatKnown: true,
  loggedIn: true,
  hasProject: true,
  setupDone: true,
  onboarded: true,
  settingsOpen: false,
}

describe('screenGate: while anything is unknown, no screen opens', () => {
  it('opens the conversation once everything is known and in place', () => {
    expect(screenGate(known)).toBe('conversation')
  })

  it('opens setup when something is missing', () => {
    expect(screenGate({ ...known, setupDone: false })).toBe('setup')
    expect(screenGate({ ...known, loggedIn: false })).toBe('setup')
    expect(screenGate({ ...known, hasProject: false })).toBe('setup')
  })

  it('does not open setup while sign-in is still unknown, which was the flash on reload', () => {
    expect(screenGate({ ...known, authKnown: false })).toBe('holding')
  })

  it('does not open setup while the project is still being restored', () => {
    expect(screenGate({ ...known, projectKnown: false, hasProject: false })).toBe('holding')
  })

  it('opens nothing while settings are still being read', () => {
    expect(screenGate({ ...known, settingsLoaded: false })).toBe('holding')
  })

  it('waits on any one unknown, whether or not the rest is ready', () => {
    expect(screenGate({ ...known, authKnown: false, setupDone: false })).toBe('holding')
  })

  it('answers once it knows, so the wait cannot last forever', () => {
    expect(screenGate({ ...known, authKnown: true, loggedIn: false })).toBe('setup')
  })
})

describe('reopening settings does not undo having finished', () => {
  it('shows setup when setup is opened, finished or not', () => {
    expect(screenGate({ ...known, settingsOpen: true })).toBe('setup')
  })

  it('goes back to the conversation on close, since setupDone was never touched', () => {
    expect(screenGate({ ...known, settingsOpen: false })).toBe('conversation')
  })

  it('waits before showing setup while nothing is known yet', () => {
    expect(screenGate({ ...known, settingsOpen: true, settingsLoaded: false })).toBe('holding')
  })
})

describe('an unread history is not shown as an empty screen', () => {
  it('waits, because an empty chat that fills in later reads as one that was wiped', () => {
    expect(screenGate({ ...known, chatKnown: false })).toBe('holding')
  })

  it('answers the missing project first, since there is no history without one', () => {
    expect(screenGate({ ...known, chatKnown: false, hasProject: false })).toBe('setup')
  })
})

describe('screenGate: the first run says what this is before asking for anything', () => {
  const ready = {
    settingsLoaded: true,
    authKnown: true,
    projectKnown: true,
    chatKnown: true,
    loggedIn: false,
    hasProject: false,
    setupDone: false,
    onboarded: false,
    settingsOpen: false,
  }

  it('opens on the welcome, before the account is asked for', () => {
    expect(screenGate(ready)).toBe('welcome')
  })

  it('moves on to setup once the welcome has been read', () => {
    expect(screenGate({ ...ready, onboarded: true })).toBe('setup')
  })

  it('never shows the welcome again to someone set up', () => {
    const settled = { ...ready, onboarded: true, setupDone: true, loggedIn: true, hasProject: true }
    expect(screenGate(settled)).toBe('conversation')
  })

  it('waits for what it knows before saying anything at all', () => {
    expect(screenGate({ ...ready, settingsLoaded: false })).toBe('holding')
  })

  it('lets you open settings from the welcome without being sent back', () => {
    expect(screenGate({ ...ready, settingsOpen: true })).toBe('setup')
  })
})
