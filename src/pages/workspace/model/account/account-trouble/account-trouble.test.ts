import { describe, expect, it } from 'vitest'
import { accountTroubleLine } from './account-trouble'

const FAILED = 'Could not switch accounts.'
const RUNNING = 'A session is still running, so your account was not changed.'

describe('accountTroubleLine: what the pane says when a change was refused', () => {
  it('says the session is still running and the account did not move', () => {
    expect(
      accountTroubleLine({ code: 'timeout', said: 'a process would not stop' }, FAILED, RUNNING),
    ).toBe(RUNNING)
  })

  it('shows the CLI’s last word when there is one', () => {
    expect(
      accountTroubleLine({ code: 'failed', said: 'no credentials kept for a1' }, FAILED, RUNNING),
    ).toBe('no credentials kept for a1')
  })

  it('says a cancelled sign-in was cancelled, in the pane’s own words', () => {
    expect(accountTroubleLine({ code: 'cancelled', said: '' }, FAILED, RUNNING)).toBe(
      'Sign-in was cancelled.',
    )
  })

  it('says a login that ended without an account did so, rather than naming it', () => {
    const line = accountTroubleLine(
      { code: 'failed', said: 'login-not-signed-in' },
      FAILED,
      RUNNING,
    )
    expect(line).not.toBe('login-not-signed-in')
    expect(line).toBe('Sign-in ended without an account, so nothing was changed.')
  })

  it('turns a named trouble into a sentence, since the name means nothing', () => {
    const line = accountTroubleLine(
      { code: 'failed', said: 'switch-not-confirmed' },
      FAILED,
      RUNNING,
    )
    expect(line).not.toBe('switch-not-confirmed')
    expect(line).toContain('Claude Code')
  })

  it('says a keychain that would not answer is why nothing moved', () => {
    const line = accountTroubleLine(
      { code: 'failed', said: 'credentials-unreadable' },
      FAILED,
      RUNNING,
    )
    expect(line).not.toBe('credentials-unreadable')
    expect(line).toContain('keychain')
  })

  it('falls back to the sentence for the operation when nothing was said', () => {
    expect(accountTroubleLine({ code: 'failed', said: '' }, FAILED, RUNNING)).toBe(FAILED)
  })
})
