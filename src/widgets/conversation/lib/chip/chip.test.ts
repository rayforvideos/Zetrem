import { describe, expect, it } from 'vitest'
import { chipOf } from './chip'

describe('chipOf: what the composer chip is allowed to claim', () => {
  it('says only the pick when no session is running to contradict it', () => {
    expect(chipOf({ wanted: 'ask', running: null })).toEqual({ pick: 'ask', inForce: null })
  })

  it('says only the pick when the running session is already on it', () => {
    expect(chipOf({ wanted: 'ask', running: 'ask' })).toEqual({ pick: 'ask', inForce: null })
  })

  it('names what is in force as well as the pick when they have come apart', () => {
    expect(chipOf({ wanted: 'ask', running: 'bypass' })).toEqual({
      pick: 'ask',
      inForce: 'bypass',
    })
  })

  it('keeps the pick as the pick, so the menu still checks what the person chose', () => {
    expect(chipOf({ wanted: 'plan', running: 'acceptEdits' }).pick).toBe('plan')
  })

  it('goes quiet again once the session catches up with the pick', () => {
    const changed = chipOf({ wanted: 'ask', running: 'bypass' })
    const restarted = chipOf({ wanted: 'ask', running: 'ask' })
    expect(changed.inForce).not.toBeNull()
    expect(restarted.inForce).toBeNull()
  })
})
