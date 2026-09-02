import { describe, expect, it } from 'vitest'
import { leaving } from './leave'

describe('leaving a chat', () => {
  it('is a switch when the id differs, and never a stop', () => {
    expect(leaving('a', 'b')).toBe('switch')
    expect(leaving('a', 'a')).toBe('stay')
    expect(leaving(null, 'a')).toBe('switch')
  })
})
