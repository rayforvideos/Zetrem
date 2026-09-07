import { describe, expect, it } from 'vitest'
import { endedWith, exitReason, startTrouble } from './exit-reason'
import type { Ending } from './exit-reason.types'

function ending(patch: Partial<Ending>): Ending {
  return { code: 0, signal: null, stderr: '', spawnError: '', asked: false, ...patch }
}

describe('endedWith: the word for how a process ended', () => {
  it('names the code where the CLI chose its own end', () => {
    expect(endedWith(3, null)).toBe('exit 3')
  })

  it('prefers the signal, and reads 128 + the number as one too', () => {
    expect(endedWith(null, 'SIGKILL')).toBe('SIGKILL')
    expect(endedWith(137, null)).toBe('SIGKILL')
    expect(endedWith(143, null)).toBe('SIGTERM')
    expect(endedWith(130, null)).toBe('SIGINT')
  })

  it('still says something when the child reported neither', () => {
    expect(endedWith(null, null)).toBe('exit unknown')
  })
})

describe('exitReason', () => {
  it('stays quiet when the CLI simply finished', () => {
    expect(exitReason(ending({ code: 0, stderr: 'some chatter' }))).toBeNull()
  })

  it('names a missing CLI in words a person can act on', () => {
    const said = exitReason(ending({ code: -1, spawnError: 'spawn claude ENOENT' }))
    expect(said).toEqual({ code: 'cli-missing', said: '', ended: '' })
  })

  it('carries the last thing the CLI complained about, with how it ended after it', () => {
    expect(exitReason(ending({ code: 1, stderr: 'warming up\nInvalid API key\n' }))).toEqual({
      code: 'cli-said',
      said: 'Invalid API key',
      ended: 'exit 1',
    })
  })

  it('names a silent exit code', () => {
    expect(exitReason(ending({ code: 1, stderr: '   \n\n' }))).toEqual({
      code: 'died',
      said: '1',
      ended: 'exit 1',
    })
  })

  it('tells an end nobody asked for even when a signal is all it left behind', () => {
    expect(exitReason(ending({ code: null, signal: 'SIGKILL' }))).toEqual({
      code: 'signalled',
      said: 'SIGKILL',
      ended: 'SIGKILL',
    })
    expect(exitReason(ending({ code: 143 }))).toEqual({
      code: 'signalled',
      said: 'SIGTERM',
      ended: 'SIGTERM',
    })
  })

  it('says nothing at all about an end Zetrem itself asked for', () => {
    expect(exitReason(ending({ code: null, signal: 'SIGTERM', asked: true }))).toBeNull()
    expect(exitReason(ending({ code: 143, asked: true }))).toBeNull()
    expect(exitReason(ending({ code: 1, stderr: 'Invalid API key', asked: true }))).toBeNull()
  })

  it('recognises a missing command reported through stderr instead', () => {
    expect(exitReason(ending({ code: 127, stderr: 'claude: command not found' }))?.code).toBe(
      'cli-missing',
    )
  })

  it('never writes a sentence, so the screen can say it in any language', () => {
    const said = exitReason(ending({ code: 1, stderr: 'warming up\nInvalid API key\n' }))
    expect(Object.keys(said ?? {}).sort()).toEqual(['code', 'ended', 'said'])
  })
})

describe('startTrouble', () => {
  it('keeps an unfamiliar cause rather than guessing', () => {
    expect(startTrouble('EACCES permission denied')).toEqual({
      code: 'start-failed',
      said: 'EACCES permission denied',
      ended: '',
    })
  })

  it('still says something when there is nothing to quote', () => {
    expect(startTrouble('')).toEqual({ code: 'start-failed', said: '', ended: '' })
  })
})
