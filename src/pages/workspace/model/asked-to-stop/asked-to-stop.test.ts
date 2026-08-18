import { describe, expect, it } from 'vitest'
import type { ClaudeTurnEvent } from '@/entities/agent-session'
import { afterYouStopped, stoppedByYou } from './asked-to-stop'

const stopped: ClaudeTurnEvent = { type: 'notice', text: 'Stopped: Something went wrong while it was working' }

describe('afterYouStopped: whose doing it was', () => {
  it('says it was yours when you were the one who stopped it', () => {
    expect(afterYouStopped(stopped, true)).toEqual({ type: 'notice', text: stoppedByYou() })
  })

  it('leaves the reason alone when nobody asked it to stop', () => {
    expect(afterYouStopped(stopped, false)).toBe(stopped)
  })

  it('touches nothing else that arrives while it is stopping', () => {
    const words: ClaudeTurnEvent = { type: 'delta', text: 'half a word' }
    expect(afterYouStopped(words, true)).toBe(words)
    const other: ClaudeTurnEvent = { type: 'notice', text: 'Rate limited. Trying again in 5s' }
    expect(afterYouStopped(other, true)).toBe(other)
  })
})
