import { describe, expect, it } from 'vitest'
import { SIGN_OUT_TITLE, signOutHint, signOutWarning } from './sign-out-warning'

describe('signing out is machine wide, and the words have to say so', () => {
  it('warns that it reaches past this app, since it clears the CLI credential', () => {
    const said = signOutWarning(false)
    expect(said, 'Zetrem 만 로그아웃되는 것처럼 읽히면 안 된다').toContain('this computer')
    expect(said).toContain('CLI')
  })

  it('adds the running session to the warning when one is live', () => {
    expect(signOutWarning(true)).toContain('session running here stops')
  })

  it('still names the wider reach even while a session is running', () => {
    expect(signOutWarning(true)).toContain('this computer')
  })

  it('asks before doing it, rather than stating it as a fact', () => {
    expect(SIGN_OUT_TITLE.endsWith('?')).toBe(true)
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
