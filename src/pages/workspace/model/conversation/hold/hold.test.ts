import { describe, expect, it } from 'vitest'
import type { Turn } from '@/entities/conversation'
import { LIVE_OUTPUT_CAP, LIVE_TURN_CAP, heldOutput, heldTurns } from './hold'

function turn(text: string): Turn {
  return { role: 'assistant', text, tools: [], draft: '', thinking: '', startedAtMs: 0 }
}

describe('heldTurns: a chat left open all day does not grow without end', () => {
  it('leaves a conversation that fits alone, and the same array at that', () => {
    const few = [turn('a'), turn('b')]
    expect(heldTurns(few)).toBe(few)
  })

  it('keeps the newest once there are more than it holds', () => {
    const many = Array.from({ length: LIVE_TURN_CAP + 10 }, (_, at) => turn(String(at)))
    const held = heldTurns(many)
    expect(held).toHaveLength(LIVE_TURN_CAP)
    expect(held.at(-1)?.text).toBe(String(LIVE_TURN_CAP + 9))
    expect(held[0]?.text).toBe('10')
  })

  it('holds more than the saved file does, so nothing on screen is lost to the cap first', () => {
    expect(LIVE_TURN_CAP).toBeGreaterThan(200)
  })
})

describe('heldOutput: one huge tool result does not sit in memory whole', () => {
  it('leaves an ordinary result untouched', () => {
    expect(heldOutput('total 40')).toBe('total 40')
  })

  it('cuts a result far past what anyone reads, and says it cut', () => {
    const huge = 'x'.repeat(LIVE_OUTPUT_CAP + 500)
    const held = heldOutput(huge)
    expect(held.length).toBe(LIVE_OUTPUT_CAP + 2)
    expect(held.endsWith('\n…')).toBe(true)
  })

  it('keeps far more than the saved file does, so the detail view stays useful', () => {
    expect(LIVE_OUTPUT_CAP).toBeGreaterThan(4000)
  })

  it('leaves an empty result empty', () => {
    expect(heldOutput('')).toBe('')
  })
})
