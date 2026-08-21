import { beforeEach, describe, expect, it } from 'vitest'
import { parseClaudeLine, sessionStore, statusStore } from '@/entities/agent-session'
import type { AgentEventRefs } from '@/pages/workspace/model/agent-events/agent-events.types'
import { applyAgentEvent } from '@/pages/workspace/model/agent-events/agent-events'
import { conversation } from '@/pages/workspace/model/conversation/conversation'
import captured from './live-subagent.json'

function refs(): AgentEventRefs {
  return { asks: [], childIds: new Set<string>(), sends: new Map<string, string>() }
}

function replay(): AgentEventRefs {
  const held = refs()
  for (const event of captured) {
    for (const turn of parseClaudeLine(JSON.stringify(event))) applyAgentEvent(turn, held)
  }
  return held
}

describe('a real run of the CLI, replayed line for line', () => {
  beforeEach(() => {
    sessionStore.clear()
    statusStore.reset()
    conversation.reset()
  })

  it('opens exactly one agent, and it is the one that was summoned', () => {
    replay()
    const children = sessionStore.get()
    expect(children).toHaveLength(1)
    expect(children[0]!.subagentType).toBe('Explore')
  })

  it('parks the agent at reported when the CLI completes its task, keeping the tile', () => {
    replay()
    expect(sessionStore.get()[0]!.status).toBe('reported')
  })

  it('never mistakes a backgrounded shell command for a teammate', () => {
    const held = replay()
    expect(held.childIds.size).toBe(1)
    expect(sessionStore.get().map((s) => s.subagentType)).toEqual(['Explore'])
  })

  it('keeps what the agent was told and what it reported', () => {
    replay()
    const child = sessionStore.get()[0]!
    expect(child.transcript[0]?.text).toContain('python3')
    expect(child.headline).toBe('done')
  })

  it('records the work the agent did, with its result', () => {
    replay()
    const calls = sessionStore.get()[0]!.stream
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.some((call) => call.line.startsWith('Bash'))).toBe(true)
  })

  it('settles the conversation at the end of the run', () => {
    replay()
    expect(conversation.get().status).not.toBe('working')
  })
})
