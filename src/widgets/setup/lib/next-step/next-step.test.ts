import { describe, expect, it } from 'vitest'
import { nextStep } from './next-step'

type Pending =
  | { kind: 'switch'; id: string | null }
  | { kind: 'reauth'; id: string }
  | { kind: 'remove'; id: string }
  | { kind: 'add' }
  | { kind: 'signout' }

const ACTIONS: Pending[] = [
  { kind: 'switch', id: 'a1' },
  { kind: 'switch', id: null },
  { kind: 'reauth', id: 'a1' },
  { kind: 'remove', id: 'a1' },
  { kind: 'add' },
  { kind: 'signout' },
]

describe('nextStep gates every account action the same way', () => {
  it.each(ACTIONS)('asks first when a session is live: %o', (action) => {
    expect(nextStep(true, action)).toEqual({ confirm: action })
  })

  it.each(ACTIONS)('runs at once when no session is live: %o', (action) => {
    expect(nextStep(false, action)).toEqual({ run: action })
  })

  it('never both confirms and runs the same call', () => {
    const confirmed = nextStep(true, { kind: 'signout' } as const)
    const run = nextStep(false, { kind: 'signout' } as const)
    expect('run' in confirmed).toBe(false)
    expect('confirm' in run).toBe(false)
  })
})
