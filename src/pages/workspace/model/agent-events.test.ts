import { beforeEach, describe, expect, it } from 'vitest'
import { sessionStore, statusStore } from '@/entities/agent-session'
import type { RateLimit, ResultMetrics } from '@/entities/agent-session'
import type { AgentEventRefs } from './agent-events'
import { applyAgentEvent, compactedLine, limitLine, turnLine } from './agent-events'
import { conversation } from './conversation'

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
  return { asks: [], childIds: new Set<string>() }
}

beforeEach(() => {
  conversation.reset()
  statusStore.reset()
  sessionStore.clear()
})

describe('applyAgentEvent — 순서가 못 박혀야 한다', () => {
  it('턴 결산 줄은 세션 누적이 아니라 이번 턴의 차액을 담는다', () => {
    // statusStore.apply 가 먼저 돌아 차액을 계산해야 두 번째 턴 결산이 0.06 을 말한다.
    // 두 if 블록이 뒤집히면 이 assert 가 $0.1600 (누적) 을 보게 되어 빨개진다.
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
    expect(last.text).toContain('7일 한도 28%')
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
    expect(turn.draft).toBe('') // 커서만 거둔다
    expect(conversation.get().status).toBe('waiting')
  })

  it('정상 턴은 턴 끝에서 아무것도 달라지지 않는다 — 확정본이 이미 초안을 지웠다', () => {
    applyAgentEvent({ type: 'delta', text: '안녕' }, fakeRefs())
    applyAgentEvent({ type: 'headline', text: '안녕하세요' }, fakeRefs())
    applyAgentEvent({ type: 'turnEnded' }, fakeRefs())
    const turn = conversation.get().turns.at(-1)!
    expect(turn.text).toBe('안녕하세요') // 같은 문장이 두 번 서지 않는다
    expect(turn.draft).toBe('')
  })

  it('API 오류가 있으면 턴 결산 앞에 오류 줄이 먼저 선다', () => {
    applyAgentEvent(
      { type: 'metrics', metrics: fakeMetrics(0.1, { apiErrorStatus: '529' }) },
      fakeRefs(),
    )
    const lines = conversation.get().turns.map((turn) => turn.text)
    expect(lines[0]).toBe('API 오류 529')
    expect(lines[1]).toContain('이 턴')
  })

  it(
    '부모의 눈금은 Agent 결과를 받지만 자식 타일은 그걸로 닫히지 않는다 — ' +
      '그 결과는 완료가 아니라 접수증이다',
    () => {
      const refs = fakeRefs()
      // 부모가 Agent 도구를 쓴 눈금이 먼저 서야 결과가 붙을 자리가 있다
      applyAgentEvent({ type: 'stream', line: 'Agent 산술', toolUseId: 'toolu_1', input: {} }, refs)
      applyAgentEvent(
        { type: 'childOpen', toolUseId: 'toolu_1', label: '산술', prompt: '2+2?', background: false },
        refs,
      )
      applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_1' }, refs)
      applyAgentEvent(
        { type: 'toolResult', toolUseId: 'toolu_1', stdout: '4', stderr: '', isError: false, interrupted: false },
        refs,
      )

      // 부모 대화의 눈금이 결과를 받았다 — 자식으로 오인해 삼키지 않았다는 뜻
      const tool = conversation.get().turns.at(-1)!.tools.find((t) => t.toolUseId === 'toolu_1')
      expect(tool?.result?.stdout).toBe('4')

      // 그런데 자식 타일은 아직 살아 있어야 한다. Agent 도구의 tool_result 는 이 CLI 에서
      // **접수증**이다 — 앱 실기 기록(2026-08-14): 열림 02:00:03.867 → 결과 02:00:03.964,
      // 97ms 뒤에 "Async agent launched successfully" 가 온다. run_in_background 는 붙지도
      // 않는다. 여기서 닫으면 타일이 태어난 지 한 순간에 사라진다
      expect(sessionStore.get().find((s) => s.id === 'toolu_1')?.status).toBe('working')

      // 진짜 완료는 task_notification 이다
      applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_1', summary: '4' }, refs)
      expect(sessionStore.get().find((s) => s.id === 'toolu_1')?.status).toBe('done')
    },
  )

  it('에러를 달고 온 childClosed 는 자식을 닫는다 — 죽은 자식은 접수증을 남기지 않는다', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'childOpen', toolUseId: 'toolu_3', label: '실패할 일', prompt: 'x', background: false },
      refs,
    )
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_3', error: '파일을 찾지 못했다' }, refs)

    const child = sessionStore.get().find((s) => s.id === 'toolu_3')
    expect(child?.status).toBe('done')
    expect(child?.headline).toContain('실패')
  })

  it('백그라운드 자식도 childClosed 로 안 닫힌다 — 접수증일 뿐, childNotified 가 진짜 완료다', () => {
    const refs = fakeRefs()
    applyAgentEvent(
      { type: 'childOpen', toolUseId: 'toolu_2', label: '백그라운드 일', prompt: 'x', background: true },
      refs,
    )
    applyAgentEvent({ type: 'childClosed', toolUseId: 'toolu_2' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_2')?.status).toBe('working')

    applyAgentEvent({ type: 'childNotified', toolUseId: 'toolu_2', summary: '4' }, refs)
    expect(sessionStore.get().find((s) => s.id === 'toolu_2')?.status).toBe('done')
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
    expect(line).toContain('초과분 사용 중')
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
    expect(compactedLine('auto', 148200, 31100)).toBe('여기서 대화가 압축됐습니다 (자동) — 148.2k → 31.1k')
  })

  it('trigger 가 manual 이면 수동으로 옮긴다', () => {
    expect(compactedLine('manual', 100000, 20000)).toBe('여기서 대화가 압축됐습니다 (수동) — 100.0k → 20.0k')
  })

  it('trigger 를 모르면 괄호를 통째로 뺀다 — 빈 괄호를 찍지 않는다', () => {
    expect(compactedLine(null, 148200, 31100)).toBe('여기서 대화가 압축됐습니다 — 148.2k → 31.1k')
  })

  it('trigger 가 알려지지 않은 셋째 값이면 영어 토큰 대신 괄호를 뺀다', () => {
    expect(compactedLine('scheduled', 148200, 31100)).toBe('여기서 대화가 압축됐습니다 — 148.2k → 31.1k')
  })

  it('토큰 수를 모르면 대화 요약이라는 사실만 남기고 숫자는 찍지 않는다', () => {
    expect(compactedLine('auto', null, 31100)).toBe('여기서 대화가 압축됐습니다 — 앞의 내용은 요약으로 남습니다')
    expect(compactedLine('auto', 148200, null)).toBe('여기서 대화가 압축됐습니다 — 앞의 내용은 요약으로 남습니다')
    expect(compactedLine(null, null, null)).toBe('여기서 대화가 압축됐습니다 — 앞의 내용은 요약으로 남습니다')
  })
})
