import { describe, expect, it } from 'vitest'
import { stateOf } from './notify-state'

describe('stateOf', () => {
  it('calls a refusal denied', () => {
    expect(stateOf('denied')).toBe('denied')
  })

  it('calls a restriction denied, since no notification will show', () => {
    expect(stateOf('restricted')).toBe('denied')
  })

  it('calls an unanswered question unasked', () => {
    expect(stateOf('not determined')).toBe('unasked')
  })

  it('calls authorization allowed', () => {
    expect(stateOf('authorized')).toBe('allowed')
  })

  it('reads an unforeseen answer as allowed rather than locking the switch', () => {
    expect(stateOf('provisional')).toBe('allowed')
  })
})
