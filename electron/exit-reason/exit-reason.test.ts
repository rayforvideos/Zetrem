import { describe, expect, it } from 'vitest'
import { exitReason, startTrouble } from './exit-reason'

describe('exitReason', () => {
  it('says nothing about a clean end', () => {
    expect(exitReason(0, 'some chatter', '')).toBeNull()
  })

  it('names a missing CLI in words a person can act on', () => {
    const said = exitReason(-1, '', 'spawn claude ENOENT')
    expect(said).toBe(
      'The claude command was not found. Install the Claude Code CLI, then try again.',
    )
  })

  it('carries the last thing the CLI complained about', () => {
    expect(exitReason(1, 'warming up\nInvalid API key\n', '')).toBe('Invalid API key')
  })

  it('stays quiet when a stopped run left nothing behind', () => {
    expect(exitReason(null, '   \n\n', '')).toBeNull()
  })

  it('recognises a missing command reported through stderr instead', () => {
    expect(exitReason(127, 'claude: command not found', '')).toContain('Install the Claude Code CLI')
  })
})

describe('startTrouble', () => {
  it('keeps an unfamiliar cause rather than guessing', () => {
    expect(startTrouble('EACCES permission denied')).toBe(
      'Could not start Claude Code: EACCES permission denied',
    )
  })

  it('still says something when there is nothing to quote', () => {
    expect(startTrouble('')).toBe('Could not start Claude Code')
  })
})
