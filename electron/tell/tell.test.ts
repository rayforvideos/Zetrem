import { describe, expect, it, vi } from 'vitest'
import { canTell, tell } from './tell'

function sink(overrides: Partial<{ destroyed: boolean; writable: boolean }> = {}) {
  return { destroyed: false, writable: true, write: vi.fn(), ...overrides }
}

describe('tell: writing to an agent that may already be gone', () => {
  it('writes to a living agent', () => {
    const stdin = sink()
    expect(tell(stdin, 'hello\n')).toBe(true)
    expect(stdin.write).toHaveBeenCalledWith('hello\n')
  })

  it('says nothing to an agent whose pipe has been torn down', () => {
    const stdin = sink({ destroyed: true })
    expect(tell(stdin, 'hello\n')).toBe(false)
    expect(stdin.write).not.toHaveBeenCalled()
  })

  it('says nothing to a pipe that has stopped taking writes', () => {
    const stdin = sink({ writable: false })
    expect(tell(stdin, 'hello\n')).toBe(false)
    expect(stdin.write).not.toHaveBeenCalled()
  })

  it('reads the pipe the same way whether asked to write or only to check', () => {
    expect(canTell(sink())).toBe(true)
    expect(canTell(sink({ destroyed: true }))).toBe(false)
    expect(canTell(sink({ writable: false }))).toBe(false)
  })
})
