import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import {
  reauthTitle,
  reauthWarning,
  removeTitle,
  removeWarning,
  signOutTitle,
  signOutWarning,
} from './sign-out-warning'

describe('signing out is machine wide, and the words have to say so', () => {
  it('warns that it reaches past this app, since it clears the CLI credential', () => {
    const said = signOutWarning(false)
    expect(said, 'it must not read as though only Zetrem signs out').toContain('this computer')
    expect(said).toContain('CLI')
  })

  it('adds the running session to the warning when one is live', () => {
    expect(signOutWarning(true)).toContain('session running here stops')
  })

  it('still names the wider reach even while a session is running', () => {
    expect(signOutWarning(true)).toContain('this computer')
  })

  it('asks before doing it, rather than stating it as a fact', () => {
    expect(signOutTitle().endsWith('?')).toBe(true)
  })

  it('never promises that signing back in is only about picking an account', () => {
    expect(signOutWarning(true)).not.toContain('different Anthropic account')
  })
})

describe('removing an account names what it actually does, not a generic switch', () => {
  it('asks before doing it', () => {
    expect(removeTitle().endsWith('?')).toBe(true)
  })

  it('says the credential is forgotten, whether or not the account is active', () => {
    expect(removeWarning(false)).toContain('forgets the saved credentials')
    expect(removeWarning(true)).toContain('forgets the saved credentials')
  })

  it('says nothing about a default or a running session for an inactive account', () => {
    const said = removeWarning(false)
    expect(said).not.toContain('system default')
    expect(said).not.toContain('session running here stops')
  })

  it('says the machine stays signed in with no active account when the active one is removed', () => {
    const said = removeWarning(true)
    expect(said).toContain('stays signed in')
    // Removal touches nothing on the machine, so it must not threaten the session.
    expect(said).not.toContain('system default')
    expect(said).not.toContain('session running here stops')
  })
})

describe('re-authenticating says a browser tab is about to open', () => {
  it('asks before doing it', () => {
    expect(reauthTitle().endsWith('?')).toBe(true)
  })

  it('names the browser sign-in', () => {
    expect(reauthWarning(false)).toContain('sign in again')
  })

  it('adds the running session to the warning when one is live', () => {
    expect(reauthWarning(true)).toContain('session running here stops')
    expect(reauthWarning(false)).not.toContain('session running here stops')
  })
})

describe('the warning speaks whichever language the app is speaking', () => {
  afterEach(() => i18n.activate('en'))

  it('says it in Korean once the app is Korean', () => {
    i18n.activate('ko')
    expect(signOutTitle()).toContain('로그아웃')
    expect(signOutWarning(false), 'the Korean has to keep saying the whole computer').toContain(
      '이 컴퓨터',
    )
  })

  it('still adds the running session in Korean', () => {
    i18n.activate('ko')
    expect(signOutWarning(true)).toContain('세션도 멈춥니다')
  })

  it('translates remove and re-authenticate too', () => {
    i18n.activate('ko')
    expect(removeTitle()).toContain('제거')
    expect(removeWarning(true)).toContain('로그인된 상태')
    expect(reauthTitle()).toContain('로그인')
    expect(reauthWarning(true)).toContain('세션은 멈춥니다')
  })
})
