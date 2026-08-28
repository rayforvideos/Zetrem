import { describe, expect, it } from 'vitest'
import { STAR_ASK_AGAIN_MS, starDue } from './star-due'

const NOW = 1_700_000_000_000
const ready = {
  chats: 3,
  settled: true,
  starred: false,
  askedAtMs: null,
  nowMs: NOW,
  layered: false,
}

describe('starDue: when to ask for a GitHub star', () => {
  it('asks once three chats are in and a reply has just settled', () => {
    expect(starDue(ready)).toBe(true)
  })

  it('waits for the third chat, a settled reply, and a clear screen', () => {
    expect(starDue({ ...ready, chats: 2 })).toBe(false)
    expect(starDue({ ...ready, settled: false })).toBe(false)
    expect(starDue({ ...ready, layered: true })).toBe(false)
  })

  it('never asks again once the star is given', () => {
    expect(starDue({ ...ready, starred: true })).toBe(false)
  })

  it('comes back a week after the last ask, not before', () => {
    expect(starDue({ ...ready, askedAtMs: NOW - STAR_ASK_AGAIN_MS + 1 })).toBe(false)
    expect(starDue({ ...ready, askedAtMs: NOW - STAR_ASK_AGAIN_MS })).toBe(true)
  })
})
