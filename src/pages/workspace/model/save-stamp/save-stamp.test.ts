import { describe, expect, it } from 'vitest'
import type { Transcript } from '@/entities/conversation'
import type { Turn } from '@/entities/conversation/model/turn/turn'
import { stampOf } from './save-stamp'

function turn(over: Partial<Turn> = {}): Turn {
  return {
    id: 'turn-fixture',
    role: 'assistant',
    text: 'answer',
    tools: [],
    draft: '',
    thinking: '',
    startedAtMs: 0,
    ...over,
  }
}

function transcript(over: Partial<Transcript> = {}): Transcript {
  return {
    id: 'chat-1-a',
    title: '',
    sessionId: 'session-1',
    savedAtMs: 0,
    folder: '',
    spend: null,
    turns: [turn()],
    ...over,
  }
}

describe('stampOf: catching every change worth saving, not just a new turn or a new last line', () => {
  it('gives the same stamp for the same transcript', () => {
    expect(stampOf(transcript())).toBe(stampOf(transcript()))
  })

  it('changes when a tool result lands inside the last turn without touching its text or turn count', () => {
    const before = transcript({
      turns: [
        turn({
          tools: [
            { line: 'ls', toolUseId: 't1', input: {}, result: null, startedAtMs: 0, endedAtMs: null },
          ],
        }),
      ],
    })
    const after = transcript({
      turns: [
        turn({
          tools: [
            {
              line: 'ls',
              toolUseId: 't1',
              input: {},
              result: { stdout: 'ok', stderr: '', isError: false, interrupted: false },
              startedAtMs: 0,
              endedAtMs: 1,
            },
          ],
        }),
      ],
    })
    expect(stampOf(before)).not.toBe(stampOf(after))
  })

  it('changes when the spend updates', () => {
    const before = transcript({
      spend: {
        usd: 0.01,
        turns: 1,
        tokensOut: 0,
        tokensIn: 0,
        cacheRead: 0,
        cacheWrite: 0,
        durationMs: 0,
        contextUsed: 0,
        contextWindow: null,
      },
    })
    const after = transcript({
      spend: {
        usd: 0.02,
        turns: 2,
        tokensOut: 0,
        tokensIn: 0,
        cacheRead: 0,
        cacheWrite: 0,
        durationMs: 0,
        contextUsed: 0,
        contextWindow: null,
      },
    })
    expect(stampOf(before)).not.toBe(stampOf(after))
  })

  it('still changes when the last turn text changes', () => {
    const before = transcript({ turns: [turn({ text: 'a' })] })
    const after = transcript({ turns: [turn({ text: 'b' })] })
    expect(stampOf(before)).not.toBe(stampOf(after))
  })

  it('still changes when the turn count changes', () => {
    const before = transcript({ turns: [turn()] })
    const after = transcript({ turns: [turn(), turn()] })
    expect(stampOf(before)).not.toBe(stampOf(after))
  })
})
