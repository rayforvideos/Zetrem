import { describe, expect, it } from 'vitest'
import { errorLines, exitNoteLine, redacted, upFor } from './exit-note'

describe('redacted: a log a person can send us carries no key', () => {
  it('takes an API key out, keeping the words around it', () => {
    expect(redacted('Error: invalid key sk-ant-oat01-AAAA1111BBBB2222CCCC given')).toBe(
      'Error: invalid key [redacted] given',
    )
  })

  it('takes a JSON web token out', () => {
    expect(redacted('refresh failed for eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl')).toBe(
      'refresh failed for [redacted]',
    )
  })

  it('blanks what follows Bearer, not the word itself', () => {
    expect(redacted('authorization: Bearer abcdef0123456789')).toBe(
      'authorization: Bearer [redacted]',
    )
  })

  it('blanks a named secret whatever it is spelled with', () => {
    expect(redacted('ANTHROPIC_API_KEY=hunter2hunter2')).toBe('ANTHROPIC_API_KEY=[redacted]')
    expect(redacted('{"accessToken":"abcdef123456"}')).toBe('{"accessToken":"[redacted]"}')
  })

  it('leaves an ordinary error alone', () => {
    const said = 'Error: connect ECONNREFUSED 127.0.0.1:443'
    expect(redacted(said)).toBe(said)
  })

  it('never redacts twice over its own work', () => {
    expect(redacted(redacted('token: abcdef123456'))).toBe('token: [redacted]')
  })
})

describe('errorLines: the ring the log quotes from', () => {
  it('joins a line that arrived in two pieces', () => {
    const ring = errorLines()
    ring.take('first ')
    ring.take('half\n')
    expect(ring.lines()).toEqual(['first half'])
  })

  it('keeps the newest lines only, dropping the oldest', () => {
    const ring = errorLines(3)
    ring.take('one\ntwo\nthree\nfour\n')
    expect(ring.lines()).toEqual(['two', 'three', 'four'])
  })

  it('shows the last line even though its newline never came', () => {
    const ring = errorLines(3)
    ring.take('one\ntwo\nstill talking')
    expect(ring.lines()).toEqual(['one', 'two', 'still talking'])
    expect(ring.lines()).toEqual(['one', 'two', 'still talking'])
  })

  it('drops blank lines, since a blank explains nothing', () => {
    const ring = errorLines()
    ring.take('one\n\n   \ntwo\n')
    expect(ring.lines()).toEqual(['one', 'two'])
  })

  it('crops a line too long for a log, and drops the rest of it', () => {
    const ring = errorLines(5, 8)
    ring.take(`${'x'.repeat(40)}\nafter\n`)
    expect(ring.lines()).toEqual(['xxxxxxxx…', 'after'])
  })

  it('redacts as it goes, so no secret is ever held in memory to be logged', () => {
    const ring = errorLines()
    ring.take('login failed: token=abcdef123456\n')
    expect(ring.lines()).toEqual(['login failed: token=[redacted]'])
  })

  it('keeps one exit to one line, whatever the CLI painted its stderr with', () => {
    const esc = String.fromCharCode(27)
    const ring = errorLines()
    ring.take(`${esc}[31mError: it fell over${esc}[0m\r\n`)
    ring.take(`counting\rup\tto ten\n`)
    expect(ring.lines()).toEqual(['Error: it fell over', 'counting up to ten'])
  })
})

describe('upFor: how long it was up, in a word', () => {
  it('counts seconds, then minutes, then hours', () => {
    expect(upFor(0)).toBe('0s')
    expect(upFor(45_400)).toBe('45s')
    expect(upFor(192_000)).toBe('3m12s')
    expect(upFor(3_780_000)).toBe('1h03m')
  })
})

describe('exitNoteLine: one line per death, the same shape every time', () => {
  it('writes chat, host, uptime, how it ended, who asked and the stderr tail', () => {
    expect(
      exitNoteLine({
        chat: 'chat-mfx12-a7b3c1',
        host: 'agent-1757200000000-4',
        upMs: 192_000,
        ended: 'exit 1',
        asked: false,
        stderr: ['Error: connect ECONNREFUSED', 'at Socket.onError'],
      }),
    ).toBe(
      'chat=chat-mfx12-a7b3c1 host=agent-1757200000000-4 up=3m12s ended=exit 1 asked=no ' +
        'stderr=Error: connect ECONNREFUSED | at Socket.onError',
    )
  })

  it('says so plainly when Zetrem asked for the end and stderr said nothing', () => {
    expect(
      exitNoteLine({
        chat: 'chat-mfx12-a7b3c1',
        host: 'agent-1757200000000-4',
        upMs: 8_000,
        ended: 'SIGTERM',
        asked: true,
        stderr: [],
      }),
    ).toBe(
      'chat=chat-mfx12-a7b3c1 host=agent-1757200000000-4 up=8s ended=SIGTERM asked=yes stderr=none',
    )
  })

  it('admits it does not know the chat rather than guessing one', () => {
    const line = exitNoteLine({
      chat: null,
      host: 'agent-1',
      upMs: 0,
      ended: '',
      asked: false,
      stderr: [],
    })
    expect(line).toContain('chat=?')
    expect(line).toContain('ended=?')
  })
})
