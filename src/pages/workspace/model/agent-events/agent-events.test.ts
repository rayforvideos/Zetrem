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
  return { asks: [], childIds: new Set<string>(), sends: new Map<string, string>() }
}

beforeEach(() => {
  conversation.reset()
  statusStore.reset()
  sessionStore.clear()
})

describe('applyAgentEvent — 순서가 못 박혀야 한다', () => {
  it('턴 결산 줄은 세션 누적이 아니라 이번 턴의 차액을 담는다', () => {
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

  it('한도가 allowed 가 아니면 사건 줄이 선다', () => {
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
    expect(last.text).toContain('7-day limit 28%')
  })

  it('한도가 allowed 면 대화에 사건 줄을 남기지 않는다', () => {
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

  it('델타 이벤트는 대화의 초안에 흘러든다', () => {
    applyAgentEvent({ type: 'delta', text: '안' }, fakeRefs())
    applyAgentEvent({ type: 'delta', text: '녕' }, fakeRefs())
    const turn = conversation.get().turns.at(-1)!
    expect(turn.role).toBe('assistant')
    expect(turn.draft).toBe('안녕')
  })

  it('차례가 끝나면 확정되지 못한 초안이 그 글을 지킨 채 확정본이 된다', () => {
    applyAgentEvent({ type: 'delta', text: '여기까지 쓰다 멈' }, fakeRefs())
    applyAgentEvent({ type: 'turnEnded' }, fakeRefs())
    const turn = conversation.get().turns.at(-1)!
    expect(turn.text).toBe('여기까지 쓰다 멈')
    expect(turn.draft).toBe('')
    expect(conversation.get().status).toBe('waiting')
  })

  it('정상 턴은 턴 끝에서 아무것도 달라지지 않는다 — 확정본이 이미 초안을 지웠다', () => {
    applyAgentEvent({ type: 'delta', text: '안녕' }, fakeRefs())
    applyAgentEvent({ type: 'headline', text: '안녕하세요' }, fakeRefs())
    applyAgentEvent({ type: 'turnEnded' }, fakeRefs())
    const turn = conversation.get().turns.at(-1)!
    expect(turn.text).toBe('안녕하세요')
    expect(turn.draft).toBe('')
  })

  it('API 오류가 있으면 턴 결산 앞에 오류 줄이 먼저 선다', () => {
    applyAgentEvent(
      { type: 'metrics', metrics: fakeMetrics(0.1, { apiErrorStatus: '529' }) },
      fakeRefs(),
    )
    const lines = conversation.get().turns.map((turn) => turn.text)
    expect(lines[0]).toBe('API error 529')
    expect(lines[1]).toContain('This turn')
  })

  it(
    '부모의 눈금은 Agent 결과를 받지만 자식 타일은 그걸로 닫히지 않는다 — ' +
      '그 결과는 완료가 아니라 접수증이다',
    () => {
      const refs = fakeRefs()
      applyAgentEvent({ type: 'stream', line: 'Agent 산술', toolUseId: 'toolu_1', input: {} }, refs)
      applyAgentEvent(
        { type: 'childOpen', toolUseId: 'toolu_1', label: '산술', subagentType: 'general-purpose', prompt: '2+2?', background: false },
        refs,
      )
      applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_1' }, refs)
      applyAgentEvent(
        { type: 'toolResult', toolUseId: 'toolu_1', stdout: '4', stderr: '', isError: false, interrupted: false },
        refs,
      )

      const tool = conversation.get().turns.at(-1)!.tools.find((t) => t.toolUseId === 'toolu_1')
      expect(tool?.result?.stdout).toBe('4')

      expect(sessionStore.get().find((s) => s.id === 'toolu_1')?.status).toBe('working')

      applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_1', summary: '4' }, refs)
      expect(sessionStore.get().find((s) => s.id === 'toolu_1')?.status).toBe('reported')
    },
  )

  it('에러를 달고 온 childClosed 는 자식을 닫는다 — 죽은 자식은 접수증을 남기지 않는다', () => {
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

  it('백그라운드 자식도 childClosed 로 안 닫힌다 — 접수증일 뿐, childNotified 가 한 차례의 끝이다', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'childOpen', toolUseId: 'toolu_2', label: '백그라운드 일', subagentType: 'Explore', prompt: 'x', background: true },
      refs,
    )
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_2' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_2')?.status).toBe('working')

    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_2', summary: '4' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_2')?.status).toBe('reported')
  })
})

describe('limitLine — 한도는 사실만 말한다', () => {
  it('초과분을 쓰고 있으면 접미사를 붙인다', () => {
    const line = limitLine({
      kind: 'five_hour',
      utilization: 0.95,
      resetsAtMs: new Date('2026-08-14T05:00:00+09:00').getTime(),
      overage: true,
      status: 'approaching',
    })
    expect(line).toContain('on overage')
  })

  it('초과분이 아니면 접미사가 없다', () => {
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

describe('turnLine — 턴 결산', () => {
  it('turnUsd 가 0 이하이면 비용 구간을 생략한다', () => {
    expect(turnLine(fakeMetrics(0), 0)).not.toContain('$')
  })

  it('turnUsd 가 있으면 소수 네 자리로 비용을 붙인다', () => {
    expect(turnLine(fakeMetrics(0.1), 0.04)).toContain('$0.0400')
  })
})

describe('compactedLine — 압축 사건 한 줄, 모르는 것은 그리지 않는다', () => {
  it('세 값이 다 있으면 무엇이 왜 줄었는지 말한다', () => {
    expect(compactedLine('auto', 148200, 31100)).toBe('Conversation compacted here (auto) — 148.2k → 31.1k')
  })

  it('trigger 가 manual 이면 수동으로 옮긴다', () => {
    expect(compactedLine('manual', 100000, 20000)).toBe('Conversation compacted here (manual) — 100.0k → 20.0k')
  })

  it('trigger 를 모르면 괄호를 통째로 뺀다 — 빈 괄호를 찍지 않는다', () => {
    expect(compactedLine(null, 148200, 31100)).toBe('Conversation compacted here — 148.2k → 31.1k')
  })

  it('trigger 가 알려지지 않은 셋째 값이면 영어 토큰 대신 괄호를 뺀다', () => {
    expect(compactedLine('scheduled', 148200, 31100)).toBe('Conversation compacted here — 148.2k → 31.1k')
  })

  it('토큰 수를 모르면 대화 요약이라는 사실만 남기고 숫자는 찍지 않는다', () => {
    expect(compactedLine('auto', null, 31100)).toBe('Conversation compacted here — earlier turns live on as a summary')
    expect(compactedLine('auto', 148200, null)).toBe('Conversation compacted here — earlier turns live on as a summary')
    expect(compactedLine(null, null, null)).toBe('Conversation compacted here — earlier turns live on as a summary')
  })
})

describe('여러 판을 도는 자식 — 보고했다고 사라지지 않는다', () => {
  function open(refs: AgentEventRefs, id: string): void {
    applyAgentEvent(
      {
        type: 'childOpen',
        toolUseId: id,
        label: '토론',
        subagentType: 'Explore',
        prompt: '토론하자',
        background: false,
      },
      refs,
    )
  }

  it('보고한 자식이 다시 말하면 도로 일하는 중이 된다 — 2라운드는 보이지 않으면 안 된다', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_a')
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_a', summary: '1라운드 끝' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_a')?.status).toBe('reported')

    applyAgentEvent({ type: 'childSay', toolUseId: 'toolu_a', role: 'assistant', text: '2라운드' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_a')?.status).toBe('working')
  })

  it('보고한 뒤의 도구 사용도 흘려버리지 않는다', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_b')
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_b', summary: '끝' }, refs)
    applyAgentEvent({ type: 'childStream', toolUseId: 'toolu_b', line: 'Read b.ts' }, refs)

    const child = sessionStore.get().find((s) => s.id === 'toolu_b')
    expect(child?.stream).toContain('Read b.ts')
    expect(child?.status).toBe('working')
  })

  it('차례가 끝나면 보고한 자식은 닫는다 — 판이 영영 열려 있으면 안 된다', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_c')
    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_c', summary: '끝' }, refs)
    applyAgentEvent({ type: 'turnEnded' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_c')?.status).toBe('done')
    expect(refs.childIds.has('toolu_c')).toBe(false)
  })

  it('차례가 끝나도 아직 일하는 자식은 그대로 둔다 — 뒤에서 도는 사람을 죽은 셈 치면 안 된다', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_e')
    applyAgentEvent({ type: 'turnEnded' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_e')?.status).toBe('working')
    expect(refs.childIds.has('toolu_e')).toBe(true)
  })

  it('차례가 끝난 뒤에도 일하던 자식의 소식은 계속 닿는다', () => {
    const refs = fakeRefs()
    open(refs, 'toolu_f')
    applyAgentEvent({ type: 'turnEnded' }, refs)
    applyAgentEvent({ type: 'childStream', toolUseId: 'toolu_f', line: 'Read late.ts' }, refs)

    expect(sessionStore.get().find((s) => s.id === 'toolu_f')?.stream).toContain('Read late.ts')
  })
})

describe('SendMessage 로 다시 깨운 에이전트도 판을 얻는다', () => {
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

  it('Task 없이 깨워도 판이 선다 — 도는 사람이 화면에 없으면 안 된다', () => {
    const refs = fakeRefs()
    send(refs, 'tu_1', 'Joi', resumed)

    const child = sessionStore.get().find((s) => s.id === 'abc34151ab50738ee')
    expect(child?.status).toBe('working')
    expect(child?.label).toBe('Joi')
    expect(refs.childIds.has('abc34151ab50738ee')).toBe(true)
  })

  it('깨운 뒤의 소식이 그 판에 닿는다', () => {
    const refs = fakeRefs()
    send(refs, 'tu_2', 'Hardy', resumed)
    applyAgentEvent(
      { type: 'childStream', toolUseId: 'abc34151ab50738ee', line: 'Read a.ts' },
      refs,
    )
    expect(sessionStore.get().find((s) => s.id === 'abc34151ab50738ee')?.stream).toContain('Read a.ts')
  })

  it('그냥 말만 건 SendMessage 는 판을 만들지 않는다', () => {
    const refs = fakeRefs()
    send(refs, 'tu_3', 'Ray', '{"success":true,"message":"delivered"}')
    expect(sessionStore.get()).toHaveLength(0)
  })

  it('다른 도구의 결과는 건드리지 않는다', () => {
    const refs = fakeRefs()
    applyAgentEvent({ type: 'stream', line: 'Bash ls', toolUseId: 'tu_4', input: {} }, refs)
    applyAgentEvent(
      { type: 'toolResult', toolUseId: 'tu_4', stdout: resumed, stderr: '', isError: false, interrupted: false },
      refs,
    )
    expect(sessionStore.get()).toHaveLength(0)
  })

  it('같은 사람을 두 번 깨워도 판은 하나다', () => {
    const refs = fakeRefs()
    send(refs, 'tu_5', 'Joi', resumed)
    send(refs, 'tu_6', 'Joi', resumed)
    expect(sessionStore.get()).toHaveLength(1)
  })
})
