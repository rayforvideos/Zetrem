import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { signOutHint, signOutTitle, signOutWarning } from './sign-out-warning'

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

  it('says the reach in the quiet hint too, before anyone reaches for the button', () => {
    expect(signOutHint(false)).toContain('every Claude Code on this computer')
    expect(signOutHint(true)).toContain('every other Claude Code on this computer')
  })

  it('never promises that signing back in is only about picking an account', () => {
    for (const said of [signOutHint(true), signOutHint(false), signOutWarning(true)]) {
      expect(said).not.toContain('different Anthropic account')
    }
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

  it('keeps the quiet hint in Korean too', () => {
    i18n.activate('ko')
    expect(signOutHint(false)).toContain('전부 로그아웃')
  })
})
