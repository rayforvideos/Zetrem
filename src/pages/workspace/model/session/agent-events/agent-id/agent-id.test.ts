import { describe, expect, it } from 'vitest'
import type { ClaudeTurnEvent } from '@/entities/claude-cli'
import { agentIdIn } from './agent-id'

function result(overrides: Partial<Extract<ClaudeTurnEvent, { type: 'toolResult' }>> = {}) {
  return {
    type: 'toolResult' as const,
    toolUseId: 'toolu_01',
    stdout: 'done',
    stderr: '',
    isError: false,
    interrupted: false,
    ...overrides,
  }
}

describe('which teammate a finished Agent call left its work under', () => {
  it('reads the runtime id off the result, keyed by the tool call the tile is', () => {
    expect(agentIdIn(result({ agentId: 'a879059595fc11096' }))).toEqual({
      toolUseId: 'toolu_01',
      agentId: 'a879059595fc11096',
    })
  })

  it('says nothing for a result that carries no id, which most tools do not', () => {
    expect(agentIdIn(result())).toBeNull()
    expect(agentIdIn(result({ agentId: '' }))).toBeNull()
  })

  it('says nothing for a turn that is not a tool result at all', () => {
    expect(agentIdIn({ type: 'delta', text: 'hi' })).toBeNull()
    expect(agentIdIn({ type: 'turnEnded' })).toBeNull()
  })
})
