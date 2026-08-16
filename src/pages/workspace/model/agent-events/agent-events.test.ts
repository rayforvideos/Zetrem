import { beforeEach, describe, expect, it } from 'vitest'
import { sessionStore, statusStore } from '@/entities/agent-session'
import type { RateLimit, ResultMetrics } from '@/entities/agent-session'
import type { AgentEventRefs } from './agent-events.types'
import { applyAgentEvent, compactedLine, limitLine, turnLine } from './agent-events'
import { conversation } from '../conversation/conversation'

function fakeMetrics(costUsd: number, overrides: Partial<ResultMetrics> = {}): ResultMetrics {
  return {
    costUsd,
    tokens: { in: 10, out: 100, cacheRead: 0, cacheCreate: 0 },
    durationMs: 1000,
    ttftMs: null,
    turns: 1,
    contextWindow: null,
    apiErrorStatus: null,
    stopReason: null,
    ...overrides,
  }
}

function fakeRefs(): AgentEventRefs {
  return { asks: [], childIds: new Set<string>(), sends: new Map<string, string>(), onModelRefused: () => {} }
}

beforeEach(() => {
  conversation.reset()
  statusStore.reset()
  sessionStore.clear()
})

describe('applyAgentEvent: the order has to be nailed down', () => {
  it('reports what this turn cost, not what the session has spent', () => {
    const refs = fakeRefs()
    applyAgentEvent({ type: 'metrics', metrics: fakeMetrics(0.1) }, refs)
    applyAgentEvent({ type: 'metrics', metrics: fakeMetrics(0.16) }, refs)

    const lines = conversation
      .get()
      .turns.filter((turn) => turn.role === 'system')
      .map((turn) => turn.text)

    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('$0.1000')
    expect(lines[1]).toContain('$0.0600')
    expect(lines[1]).not.toContain('$0.1600')
  })

  it('puts a line in the conversation when a limit is not allowed', () => {
    const limit: RateLimit = {
      kind: 'seven_day',
      utilization: 0.28,
      resetsAtMs: Date.now(),
      overage: false,
      status: 'approaching',
    }
    applyAgentEvent({ type: 'limit', limit }, fakeRefs())
    const last = conversation.get().turns.at(-1)!
    expect(last.role).toBe('system')
    expect(last.text).toContain('Weekly limit 28%')
  })

  it('leaves the conversation alone while a limit is allowed', () => {
    const limit: RateLimit = {
      kind: 'seven_day',
      utilization: 0.1,
      resetsAtMs: Date.now(),
      overage: false,
      status: 'allowed',
    }
    applyAgentEvent({ type: 'limit', limit }, fakeRefs())
    expect(conversation.get().turns).toHaveLength(0)
  })

  it('runs deltas into the draft', () => {
    applyAgentEvent({ type: 'delta', text: '안' }, fakeRefs())
    applyAgentEvent({ type: 'delta', text: '녕' }, fakeRefs())
    const turn = conversation.get().turns.at(-1)!
    expect(turn.role).toBe('assistant')
    expect(turn.draft).toBe('안녕')
  })

  it('keeps a draft that never settled when the turn ends', () => {
    applyAgentEvent({ type: 'delta', text: '여기까지 쓰다 멈' }, fakeRefs())
    applyAgentEvent({ type: 'turnEnded' }, fakeRefs())
    const turn = conversation.get().turns.at(-1)!
    expect(turn.text).toBe('여기까지 쓰다 멈')
    expect(turn.draft).toBe('')
    expect(conversation.get().status).toBe('waiting')
  })

  it('changes nothing at the end of an ordinary turn, where settled text already cleared the draft', () => {
    applyAgentEvent({ type: 'delta', text: '안녕' }, fakeRefs())
    applyAgentEvent({ type: 'headline', text: '안녕하세요' }, fakeRefs())
    applyAgentEvent({ type: 'turnEnded' }, fakeRefs())
    const turn = conversation.get().turns.at(-1)!
    expect(turn.text).toBe('안녕하세요')
    expect(turn.draft).toBe('')
  })

  it('puts the API error before the turn summary', () => {
    applyAgentEvent(
      { type: 'metrics', metrics: fakeMetrics(0.1, { apiErrorStatus: '529' }) },
      fakeRefs(),
    )
    const lines = conversation.get().turns.map((turn) => turn.text)
    expect(lines[0]).toBe('API error 529')
    expect(lines[1]).toContain('This turn')
  })

  it('shows the Agent result in the conversation and finishes the tile with it', () => {
    const refs = fakeRefs()
    applyAgentEvent({ type: 'stream', line: 'Agent sums', toolUseId: 'toolu_1', input: {} }, refs)
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: 'toolu_1',
        label: 'Sums',
        subagentType: 'general-purpose',
        prompt: '2+2?',
        background: false,
      },
      refs,
    )
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_1', taskId: 'task-toolu_1', summary: '4', done: true }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_1')?.status).toBe('reported')

    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_1' }, refs)
    applyAgentEvent(
      { type: 'toolResult', toolUseId: 'toolu_1', stdout: '4', stderr: '', isError: false, interrupted: false },
      refs,
    )

    const tool = conversation.get().turns.at(-1)!.tools.find((t) => t.toolUseId === 'toolu_1')
    expect(tool?.result?.stdout).toBe('4')
    expect(sessionStore.get().find((s) => s.id === 'toolu_1')?.status).toBe('done')
  })

  it('closes a child that came back with an error, since a dead child files no receipt', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'childOpen', toolUseId: 'toolu_3', label: '실패할 일', subagentType: 'Explore', prompt: 'x', background: false },
      refs,
    )
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_3', error: '파일을 찾지 못했다' }, refs)

    const child = sessionStore.get().find((s) => s.id === 'toolu_3')
    expect(child?.status).toBe('done')
    expect(child?.headline).toContain('Failed')
  })

  it('does not close a background child on a tool result, which is only a receipt', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'childOpen', toolUseId: 'toolu_2', label: '백그라운드 일', subagentType: 'Explore', prompt: 'x', background: true },
      refs,
    )
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_2' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_2')?.status).toBe('working')

    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_2', taskId: 'task-toolu_2', summary: '4', done: true }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_2')?.status).toBe('reported')
  })
})

describe('limitLine: a limit states facts and nothing else', () => {
  it('says so while running on overage', () => {
    const line = limitLine({
      kind: 'five_hour',
      utilization: 0.95,
      resetsAtMs: new Date('2026-08-14T05:00:00+09:00').getTime(),
      overage: true,
      status: 'approaching',
    })
    expect(line).toContain('on overage')
  })

  it('says nothing extra when not on overage', () => {
    const line = limitLine({
      kind: 'five_hour',
      utilization: 0.5,
      resetsAtMs: Date.now(),
      overage: false,
      status: 'approaching',
    })
    expect(line).not.toContain('초과분')
  })
})

describe('turnLine: what a turn came to', () => {
  it('leaves the cost out when there is none', () => {
    expect(turnLine(fakeMetrics(0), 0)).not.toContain('$')
  })

  it('writes the cost to four decimals when there is one', () => {
    expect(turnLine(fakeMetrics(0.1), 0.04)).toContain('$0.0400')
  })
})

describe('compactedLine: one line about compaction, drawing only what is known', () => {
  it('says what shrank and why when it knows all three', () => {
    expect(compactedLine('auto', 148200, 31100)).toBe('Conversation compacted here (auto): 148.2k → 31.1k')
  })

  it('says manual when the trigger was manual', () => {
    expect(compactedLine('manual', 100000, 20000)).toBe('Conversation compacted here (manual): 100.0k → 20.0k')
  })

  it('drops the brackets entirely for an unknown trigger, rather than printing empty ones', () => {
    expect(compactedLine(null, 148200, 31100)).toBe('Conversation compacted here: 148.2k → 31.1k')
  })

  it('drops the brackets for a third trigger it has no word for', () => {
    expect(compactedLine('scheduled', 148200, 31100)).toBe('Conversation compacted here: 148.2k → 31.1k')
  })

  it('keeps the fact and drops the numbers when the token counts are unknown', () => {
    expect(compactedLine('auto', null, 31100)).toBe('Conversation compacted here. Earlier turns live on as a summary.')
    expect(compactedLine('auto', 148200, null)).toBe('Conversation compacted here. Earlier turns live on as a summary.')
    expect(compactedLine(null, null, null)).toBe('Conversation compacted here. Earlier turns live on as a summary.')
  })
})

describe('a child that runs several rounds does not vanish for reporting once', () => {
  function open(refs: AgentEventRefs, id: string): void {
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: id,
        label: 'Debate',
        subagentType: 'Explore',
        prompt: 'Argue it out',
        background: false,
      },
      refs,
    )
  }

  it('puts a child back to working when it speaks again, so round two is visible', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_a')
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_a', taskId: 'task-toolu_a', summary: 'round one done', done: true }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_a')?.status).toBe('reported')

    applyAgentEvent({ type: 'childSay', toolUseId: 'toolu_a', role: 'assistant', text: 'round two' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_a')?.status).toBe('working')
  })

  it('keeps the tools a child uses after it reported', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_b')
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_b', taskId: 'task-toolu_b', summary: 'done', done: true }, refs)
    applyAgentEvent({ type: 'childStream', toolUseId: 'toolu_b', callId: 'call1', line: 'Read b.ts' }, refs)

    const child = sessionStore.get().find((s) => s.id === 'toolu_b')
    expect(child?.stream.map((call) => call.line)).toContain('Read b.ts')
    expect(child?.status).toBe('working')
  })

  it('holds a child that reported when the turn ends, because the notice can come mid job', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_c')
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_c', taskId: 'task-toolu_c', summary: 'round one', done: true }, refs)
    applyAgentEvent({ type: 'turnEnded' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_c')?.status).toBe('reported')
    expect(refs.childIds.has('toolu_c')).toBe(true)
  })

  it('marks the moment it last heard from a child, so quiet can be measured', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_k')
    applyAgentEvent({ type: 'childStream', toolUseId: 'toolu_k', callId: 'call1', line: 'Read a.ts' }, refs)

    const child = sessionStore.get().find((s) => s.id === 'toolu_k')
    expect(child?.lastSeenAtMs).toBeGreaterThan(0)
  })

  it('brings a settled child back for round two, which is why settling must not drop the id', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_g')
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_g', taskId: 'task-toolu_g', summary: 'round one', done: true }, refs)
    sessionStore.patch('toolu_g', { status: 'done' })
    applyAgentEvent({ type: 'turnEnded' }, refs)
    applyAgentEvent(
      { type: 'childSay', toolUseId: 'toolu_g', role: 'assistant', text: 'round two' },
      refs,
    )

    const child = sessionStore.get().find((s) => s.id === 'toolu_g')
    expect(child?.status).toBe('working')
    expect(child?.headline).toBe('round two')
    expect(child?.endedAtMs).toBeUndefined()
  })

  it('leaves a background agent alone when a turn ends, since it never reported', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_l')
    applyAgentEvent({ type: 'turnEnded' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_l')?.status).toBe('working')
  })

  it('reads a clean result as finished for an agent the orchestrator waited on', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: 'toolu_m',
        label: 'Sums',
        subagentType: 'general-purpose',
        prompt: '2+2?',
        background: false,
      },
      refs,
    )
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_m', taskId: 'task-toolu_m', summary: '4', done: true }, refs)
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_m' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_m')?.status).toBe('done')
  })

  it('reads a clean result as a receipt for an agent sent to the background', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: 'toolu_n',
        label: 'Sums',
        subagentType: 'general-purpose',
        prompt: '2+2?',
        background: true,
      },
      refs,
    )
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_n' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_n')?.status).toBe('working')
  })

  it('brings a child that failed back if it turns out to still be alive', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_h')
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_h', error: 'timed out' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_h')?.status).toBe('done')

    applyAgentEvent({ type: 'childStream', toolUseId: 'toolu_h', callId: 'call1', line: 'Read late.ts' }, refs)
    const child = sessionStore.get().find((s) => s.id === 'toolu_h')
    expect(child?.status).toBe('working')
    expect(child?.endedAtMs).toBeUndefined()
  })

  it('does not stack a second tile when the same child is opened twice', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_i')
    open(refs, 'toolu_i')
    expect(sessionStore.get().filter((s) => s.id === 'toolu_i')).toHaveLength(1)
  })

  it('leaves a child that is still working, because someone running in the background is not done', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_e')
    applyAgentEvent({ type: 'turnEnded' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_e')?.status).toBe('working')
    expect(refs.childIds.has('toolu_e')).toBe(true)
  })

  it('keeps hearing from a child that was working when the turn ended', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_f')
    applyAgentEvent({ type: 'turnEnded' }, refs)
    applyAgentEvent({ type: 'childStream', toolUseId: 'toolu_f', callId: 'call1', line: 'Read late.ts' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_f')?.stream.map((call) => call.line)).toContain('Read late.ts')
  })
})

describe('an agent woken by a message gets a tile too', () => {
  const resumed =
    '{"success":true,"message":"Resuming agent abc3415","resumedAgentId":"abc34151ab50738ee","pin":{"id":"abc34151ab50738ee","name":"abc34151ab50738ee","ref":"bb1918"}}'

  function send(refs: AgentEventRefs, toolUseId: string, agent: string, stdout: string): void {
    applyAgentEvent(
      { type: 'stream', line: `SendMessage ${agent}`, toolUseId, input: { agent } },
      refs,
    )
    applyAgentEvent(
      { type: 'toolResult', toolUseId, stdout, stderr: '', isError: false, interrupted: false },
      refs,
    )
  }

  it('opens a tile without a Task, because someone running must be on screen', () => {
    const refs = fakeRefs()
    send(refs, 'tu_1', 'Joi', resumed)

    const child = sessionStore.get().find((s) => s.id === 'abc34151ab50738ee')
    expect(child?.status).toBe('working')
    expect(child?.label).toBe('Joi')
    expect(refs.childIds.has('abc34151ab50738ee')).toBe(true)
  })

  it('lands what they say afterwards on that tile', () => {
    const refs = fakeRefs()
    send(refs, 'tu_2', 'Hardy', resumed)
    applyAgentEvent(
      { type: 'childStream', toolUseId: 'abc34151ab50738ee', callId: 'call1', line: 'Read a.ts' },
      refs,
    )
    expect(sessionStore.get().find((s) => s.id === 'abc34151ab50738ee')?.stream.map((call) => call.line)).toContain('Read a.ts')
  })

  it('opens nothing for a message that only delivered', () => {
    const refs = fakeRefs()
    send(refs, 'tu_3', 'Ray', '{"success":true,"message":"delivered"}')
    expect(sessionStore.get()).toHaveLength(0)
  })

  it('leaves another tool result alone', () => {
    const refs = fakeRefs()
    applyAgentEvent({ type: 'stream', line: 'Bash ls', toolUseId: 'tu_4', input: {} }, refs)
    applyAgentEvent(
      { type: 'toolResult', toolUseId: 'tu_4', stdout: resumed, stderr: '', isError: false, interrupted: false },
      refs,
    )
    expect(sessionStore.get()).toHaveLength(0)
  })

  it('keeps one tile when the same agent is woken twice', () => {
    const refs = fakeRefs()
    send(refs, 'tu_5', 'Joi', resumed)
    send(refs, 'tu_6', 'Joi', resumed)
    expect(sessionStore.get()).toHaveLength(1)
  })
})

describe('a subagent reports what it is doing while it works', () => {
  function open(refs: AgentEventRefs, id: string): void {
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: id,
        label: 'Sums',
        subagentType: 'general-purpose',
        prompt: 'go',
        background: true,
      },
      refs,
    )
  }

  it('shows what it is doing, what it reached for, and what it has spent', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_p')
    applyAgentEvent(
      { type: 'childProgress', toolUseId: 'toolu_p', taskId: 'task-toolu_p',
        doing: 'Reading the config',
        lastTool: 'Read',
        tokens: 12_822,
      },
      refs,
    )

    const child = sessionStore.get().find((s) => s.id === 'toolu_p')
    expect(child?.doing).toBe('Reading the config')
    expect(child?.tokens).toBe(12_822)
    expect(child?.stream.map((call) => call.line)).toEqual(['Read'])
  })

  it('does not repeat a tool it is still using', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_q')
    const tick = {
      type: 'childProgress' as const,
      toolUseId: 'toolu_q',
      taskId: 'task-q',
      doing: 'Reading',
      lastTool: 'Read',
      tokens: 1,
    }
    applyAgentEvent(tick, refs)
    applyAgentEvent(tick, refs)
    applyAgentEvent({ ...tick, lastTool: 'Bash' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_q')?.stream.map((call) => call.line)).toEqual(['Read', 'Bash'])
  })

  it('does not draw a bare tool name under the detailed line of the same call', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_twice')
    applyAgentEvent(
      { type: 'childStream', toolUseId: 'toolu_twice', callId: 'c1', line: 'Read use-cart.ts' },
      refs,
    )
    applyAgentEvent(
      { type: 'childCallDone', toolUseId: 'toolu_twice', callId: 'c1', failed: false, text: '' },
      refs,
    )
    applyAgentEvent(
      { type: 'childProgress', toolUseId: 'toolu_twice', taskId: 'task-twice', doing: 'Reading', lastTool: 'Read', tokens: 2 },
      refs,
    )

    expect(
      sessionStore.get().find((s) => s.id === 'toolu_twice')?.stream.map((call) => call.line),
    ).toEqual(['Read use-cart.ts'])
  })

  it('never lets a passing action erase what the agent said', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_said')
    applyAgentEvent(
      { type: 'childSay', toolUseId: 'toolu_said', role: 'assistant', text: '설정을 두 군데 고쳤습니다' },
      refs,
    )
    applyAgentEvent(
      { type: 'childProgress', toolUseId: 'toolu_said', taskId: 'task-toolu_said',
        doing: 'Running echo "--- main.tsx ---"',
        lastTool: 'Bash',
        tokens: 9,
      },
      refs,
    )

    const child = sessionStore.get().find((s) => s.id === 'toolu_said')
    expect(child?.headline).toBe('설정을 두 군데 고쳤습니다')
    expect(child?.doing).toBe('Running echo "--- main.tsx ---"')
  })

  it('drops the stale action once the agent speaks again, since it is no longer doing that', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_stale')
    applyAgentEvent(
      { type: 'childProgress', toolUseId: 'toolu_stale', taskId: 'task-toolu_stale', doing: 'Reading', lastTool: 'Read', tokens: 1 },
      refs,
    )
    applyAgentEvent(
      { type: 'childSay', toolUseId: 'toolu_stale', role: 'assistant', text: '다 봤습니다' },
      refs,
    )

    expect(sessionStore.get().find((s) => s.id === 'toolu_stale')?.doing).toBe('')
  })

  it('brings a settled agent back, because progress means it is alive', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_r')
    sessionStore.patch('toolu_r', { status: 'done' })
    applyAgentEvent(
      { type: 'childProgress', toolUseId: 'toolu_r', taskId: 'task-toolu_r', doing: '', lastTool: '', tokens: 5 },
      refs,
    )

    const child = sessionStore.get().find((s) => s.id === 'toolu_r')
    expect(child?.status).toBe('working')
    expect(child?.endedAtMs).toBeUndefined()
  })

  it('ignores progress from a task that is not one of ours, such as a subagent own shell', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'childProgress', toolUseId: 'toolu_stranger', taskId: 'task-toolu_stranger', doing: 'x', lastTool: 'Bash', tokens: 1 },
      refs,
    )
    expect(sessionStore.get()).toEqual([])
  })
})

describe('a message names the teammate it is sent to', () => {
  it('reads the recipient from the field SendMessage actually uses', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'stream', line: 'SendMessage Karina', toolUseId: 'toolu_s', input: { to: 'Karina', message: 'go on' } },
      refs,
    )
    expect(refs.sends.get('toolu_s')).toBe('Karina')
  })

  it('drops the disambiguating reference, since that is not the name on screen', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'stream', line: 'SendMessage', toolUseId: 'toolu_t', input: { to: 'Karina [3fa9c1]' } },
      refs,
    )
    expect(refs.sends.get('toolu_t')).toBe('Karina')
  })

  it('still reads the older field names, so nothing that worked stops working', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'stream', line: 'SendMessage', toolUseId: 'toolu_u', input: { agent: 'Hardy' } },
      refs,
    )
    expect(refs.sends.get('toolu_u')).toBe('Hardy')
  })

  it('names a resumed teammate by who was addressed, not by a raw id', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'stream', line: 'SendMessage', toolUseId: 'toolu_v', input: { to: 'Karina' } },
      refs,
    )
    applyAgentEvent(
      {
        type: 'toolResult',
        toolUseId: 'toolu_v',
        stdout: JSON.stringify({ success: true, resumedAgentId: 'a2ca1d0a38717aa60' }),
        stderr: '',
        isError: false,
        interrupted: false,
      },
      refs,
    )
    const woken = sessionStore.get().find((s) => s.id === 'a2ca1d0a38717aa60')
    expect(woken?.label).toBe('Karina')
    expect(woken?.subagentType).toBe('Karina')
  })
})

describe('a permission request the CLI takes back is taken off the screen', () => {
  function ask(refs: AgentEventRefs, id: string): void {
    applyAgentEvent(
      {
        type: 'permission',
        requestId: id,
        toolName: 'Bash',
        line: `Bash ${id}`,
        detail: id,
        input: {},
      },
      refs,
    )
  }

  it('clears the dialog when the one on screen is withdrawn', () => {
    const refs = fakeRefs()
    ask(refs, 'req_1')
    expect(conversation.get().permission?.requestId).toBe('req_1')

    applyAgentEvent({ type: 'permissionDropped', requestId: 'req_1' }, refs)
    expect(conversation.get().permission).toBeNull()
    expect(refs.asks).toHaveLength(0)
  })

  it('moves to the next one waiting rather than leaving a gap', () => {
    const refs = fakeRefs()
    ask(refs, 'req_1')
    ask(refs, 'req_2')
    applyAgentEvent({ type: 'permissionDropped', requestId: 'req_1' }, refs)

    expect(conversation.get().permission?.requestId).toBe('req_2')
    expect(conversation.get().permission?.line).toBe('Bash req_2')
  })

  it('takes a queued one out without disturbing the one on screen', () => {
    const refs = fakeRefs()
    ask(refs, 'req_1')
    ask(refs, 'req_2')
    applyAgentEvent({ type: 'permissionDropped', requestId: 'req_2' }, refs)

    expect(conversation.get().permission?.requestId).toBe('req_1')
    expect(refs.asks.map((held) => held.requestId)).toEqual(['req_1'])
  })

  it('shrugs off a withdrawal for something it never had', () => {
    const refs = fakeRefs()
    ask(refs, 'req_1')
    applyAgentEvent({ type: 'permissionDropped', requestId: 'req_nope' }, refs)

    expect(conversation.get().permission?.requestId).toBe('req_1')
    expect(refs.asks).toHaveLength(1)
  })

  it('goes back to working once the last request is withdrawn', () => {
    const refs = fakeRefs()
    ask(refs, 'req_1')
    applyAgentEvent({ type: 'permissionDropped', requestId: 'req_1' }, refs)
    expect(conversation.get().status).toBe('working')
  })
})

describe('what the CLI reports about itself reaches the conversation', () => {
  it('puts a notice in the conversation as its own line', () => {
    const refs = fakeRefs()
    applyAgentEvent({ type: 'notice', text: 'Stopped: Reached maximum budget ($0.02)' }, refs)
    const last = conversation.get().turns.at(-1)
    expect(last?.role).toBe('system')
    expect(last?.text).toBe('Stopped: Reached maximum budget ($0.02)')
  })
})

describe('addressing a child by the id the CLI actually sends', () => {
  function open(refs: AgentEventRefs, id: string): void {
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: id,
        label: 'Explore',
        subagentType: 'Explore',
        prompt: 'Go look',
        background: false,
      },
      refs,
    )
  }

  function link(refs: AgentEventRefs, id: string, taskId: string): void {
    applyAgentEvent(
      { type: 'childStarted', toolUseId: id, taskId, taskType: 'local_agent', description: '' },
      refs,
    )
  }

  it('finds the child by its task when the tool id is left out, which the CLI is allowed to do', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_z')
    link(refs, 'toolu_z', 'task_z')
    applyAgentEvent(
      { type: 'childNotified', toolUseId: null, taskId: 'task_z', summary: '다 봤습니다', done: true },
      refs,
    )

    const child = sessionStore.get().find((s) => s.id === 'toolu_z')
    expect(child?.status).toBe('reported')
    expect(child?.headline).toBe('다 봤습니다')
  })

  it('ignores a task it has never been introduced to', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_z')
    applyAgentEvent(
      { type: 'childNotified', toolUseId: null, taskId: 'someone_else', summary: 'hi', done: true },
      refs,
    )
    expect(sessionStore.get().find((s) => s.id === 'toolu_z')?.status).toBe('working')
  })

  it('takes a told finish rather than waiting out the silence', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_y')
    link(refs, 'toolu_y', 'task_y')
    applyAgentEvent(
      { type: 'childStateKnown', toolUseId: null, taskId: 'task_y', state: 'completed', error: '' },
      refs,
    )
    expect(sessionStore.get().find((s) => s.id === 'toolu_y')?.status).toBe('done')
  })

  it('writes down why a task failed, instead of ending it as if all was well', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_x')
    link(refs, 'toolu_x', 'task_x')
    applyAgentEvent(
      {
        type: 'childStateKnown',
        toolUseId: null,
        taskId: 'task_x',
        state: 'failed',
        error: 'the tool crashed',
      },
      refs,
    )
    const child = sessionStore.get().find((s) => s.id === 'toolu_x')
    expect(child?.status).toBe('done')
    expect(child?.headline).toContain('the tool crashed')
  })

  it('keeps a paused task on screen, since paused is not finished', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_w')
    link(refs, 'toolu_w', 'task_w')
    applyAgentEvent(
      { type: 'childStateKnown', toolUseId: null, taskId: 'task_w', state: 'paused', error: '' },
      refs,
    )
    expect(sessionStore.get().find((s) => s.id === 'toolu_w')?.status).toBe('working')
  })

  it('ends a detached agent, which the tool result deliberately leaves alone', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: 'toolu_bg',
        label: 'Explore',
        subagentType: 'Explore',
        prompt: 'Go look',
        background: true,
      },
      refs,
    )
    link(refs, 'toolu_bg', 'task_bg')
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_bg' }, refs)
    expect(
      sessionStore.get().find((s) => s.id === 'toolu_bg')?.status,
      '분리된 에이전트는 도구 결과로 끝나지 않는다',
    ).toBe('working')

    applyAgentEvent(
      { type: 'childStateKnown', toolUseId: null, taskId: 'task_bg', state: 'completed', error: '' },
      refs,
    )
    expect(sessionStore.get().find((s) => s.id === 'toolu_bg')?.status).toBe('done')
  })

  it('brings a settled child back when the CLI says it is running again', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_v')
    link(refs, 'toolu_v', 'task_v')
    sessionStore.patch('toolu_v', { status: 'done' })
    applyAgentEvent(
      { type: 'childStateKnown', toolUseId: null, taskId: 'task_v', state: 'running', error: '' },
      refs,
    )
    expect(sessionStore.get().find((s) => s.id === 'toolu_v')?.status).toBe('working')
  })
})

describe('work the CLI sends to the background stays visible while it runs', () => {
  function refs(): AgentEventRefs {
    return { asks: [], childIds: new Set(), sends: new Map(), onModelRefused: () => {} }
  }

  beforeEach(() => {
    conversation.reset()
  })

  it('puts a background command on the board with the words the CLI used', () => {
    applyAgentEvent(
      {
        type: 'childStarted',
        toolUseId: 'tu1',
        taskId: 'task1',
        taskType: 'local_bash',
        description: 'Sleep 12s then echo hi',
      },
      refs(),
    )
    const [chore] = conversation.get().chores
    expect(chore?.id).toBe('task1')
    expect(chore?.line).toBe('Sleep 12s then echo hi')
  })

  it('takes it off the board once the CLI says it finished', () => {
    const at = refs()
    applyAgentEvent(
      { type: 'childStarted', toolUseId: 'tu1', taskId: 'task1', taskType: 'local_bash', description: 'x' },
      at,
    )
    applyAgentEvent(
      { type: 'childNotified', toolUseId: 'tu1', taskId: 'task1', summary: 'x', done: true },
      at,
    )
    expect(conversation.get().chores).toHaveLength(0)
  })

  it('leaves it there while the state only says it is still running', () => {
    const at = refs()
    applyAgentEvent(
      { type: 'childStarted', toolUseId: 'tu1', taskId: 'task1', taskType: 'local_bash', description: 'x' },
      at,
    )
    applyAgentEvent(
      { type: 'childStateKnown', toolUseId: 'tu1', taskId: 'task1', state: 'running', error: '' },
      at,
    )
    expect(conversation.get().chores).toHaveLength(1)
    applyAgentEvent(
      { type: 'childStateKnown', toolUseId: 'tu1', taskId: 'task1', state: 'failed', error: 'no' },
      at,
    )
    expect(conversation.get().chores).toHaveLength(0)
  })

  it('does not put a teammate on the background board, since a teammate gets a tile', () => {
    applyAgentEvent(
      {
        type: 'childStarted',
        toolUseId: 'tu2',
        taskId: 'task2',
        taskType: 'local_agent',
        description: 'Look into the docs',
      },
      refs(),
    )
    expect(conversation.get().chores).toHaveLength(0)
  })

  it('counts the same task once, however many times the CLI announces it', () => {
    const at = refs()
    const start = {
      type: 'childStarted' as const,
      toolUseId: 'tu1',
      taskId: 'task1',
      taskType: 'local_bash',
      description: 'x',
    }
    applyAgentEvent(start, at)
    applyAgentEvent(start, at)
    expect(conversation.get().chores).toHaveLength(1)
  })
})
