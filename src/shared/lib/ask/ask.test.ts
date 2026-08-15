import { describe, expect, it } from 'vitest'
import { lastLine, outcomeLine, troubleLine } from './ask'

describe('lastLine', () => {
  it('takes the final thing said', () => {
    expect(lastLine('starting\nInvalid key\n\n')).toBe('Invalid key')
  })

  it('falls back when nothing was said', () => {
    expect(lastLine('   ')).toBe('That did not work')
  })

  it('takes the fallback it was given', () => {
    expect(lastLine('', 'Nothing came back')).toBe('Nothing came back')
  })
})

describe('outcomeLine', () => {
  it('says the done line when it worked', () => {
    expect(outcomeLine({ ok: true, out: 'noise' }, 'Added nx')).toBe('Added nx')
  })

  it('quotes the complaint when it did not', () => {
    expect(outcomeLine({ ok: false, out: 'boom\nno such plugin' }, 'Added nx')).toBe(
      'no such plugin',
    )
  })
})

describe('troubleLine', () => {
  it('joins what was tried to why it failed', () => {
    expect(troubleLine('Could not load plugins', new Error('EPERM'))).toBe(
      'Could not load plugins: EPERM',
    )
  })

  it('drops the remote wrapper the bridge adds', () => {
    const cause = new Error("Error invoking remote method 'plugins:catalog': EPERM")
    expect(troubleLine('Could not load plugins', cause)).toBe('Could not load plugins: EPERM')
  })

  it('says what was tried when there is no reason to give', () => {
    expect(troubleLine('Could not load plugins', new Error('   '))).toBe('Could not load plugins')
  })
})
