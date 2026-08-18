import { describe, expect, it } from 'vitest'
import { exitReason, startTrouble } from './exit-reason'

describe('exitReason', () => {
  it('stays quiet when the CLI simply finished', () => {
    expect(exitReason(0, 'some chatter', '')).toBeNull()
  })

  it('names a missing CLI in words a person can act on', () => {
    const said = exitReason(-1, '', 'spawn claude ENOENT')
    expect(said).toEqual({ code: 'cli-missing', said: '' })
  })

  it('carries the last thing the CLI complained about', () => {
    expect(exitReason(1, 'warming up\nInvalid API key\n', '')).toEqual({
      code: 'cli-said',
      said: 'Invalid API key',
    })
  })

  it('says nothing when there is nothing to quote', () => {
    expect(exitReason(null, '   \n\n', '')).toBeNull()
  })

  it('recognises a missing command reported through stderr instead', () => {
    expect(exitReason(127, 'claude: command not found', '')?.code).toBe('cli-missing')
  })

  it('never writes a sentence, so the screen can say it in any language', () => {
    const said = exitReason(1, 'warming up\nInvalid API key\n', '')
    expect(Object.keys(said ?? {}).sort()).toEqual(['code', 'said'])
  })
})

describe('startTrouble', () => {
  it('keeps an unfamiliar cause rather than guessing', () => {
    expect(startTrouble('EACCES permission denied')).toEqual({
      code: 'start-failed',
      said: 'EACCES permission denied',
    })
  })

  it('still says something when there is nothing to quote', () => {
    expect(startTrouble('')).toEqual({ code: 'start-failed', said: '' })
  })
})
