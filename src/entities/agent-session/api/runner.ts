import type { PermissionAsk, RunnerId, SessionStatus, WorkOutcome } from '../model/session'

/**
 * 러너가 바깥(프로세스·소켓)에서 받은 것을 도메인 이벤트로 번역해 밀어 넣는 창구.
 * 세션 객체 전체를 넘기지 않는다 — 러너가 알아야 할 것은 이 다섯뿐이다.
 */
export type RunSink = {
  headline(text: string): void
  stream(line: string): void
  meter(patch: { tokens?: number; contextUsed?: number }): void
  status(next: SessionStatus): void
  /** 사람에게 물을 권한 질문을 올리거나(ask) 걷는다(null) */
  permission(ask: PermissionAsk | null): void
  /** 대화 전문 한 마디 — headline 과 달리 자르지 않은 원문이다 */
  message(role: 'user' | 'assistant', text: string): void
  /** 세션이 남긴 작업의 행방 — 종료 직전에 한 번 온다 */
  outcome(outcome: WorkOutcome): void
  /** 서브에이전트의 수명 — 열리고, 말하고, 닫힌다. 타일로 만들지는 셸이 정한다 */
  child(event: ChildEvent): void
}

export type ChildEvent =
  | { kind: 'open'; childId: string; label: string; prompt: string }
  | { kind: 'say'; childId: string; role: 'user' | 'assistant'; text: string }
  /** 자식의 도구 활동 한 줄 — 자식 타일의 2층 */
  | { kind: 'stream'; childId: string; line: string }
  | { kind: 'close'; childId: string }

export type RunHandle = {
  stop(): void
  /**
   * 대기 중인 에이전트에게 답한다 — 있는 러너만 구현한다.
   * 없으면 그 러너의 대기는 스스로 풀리는 종류라는 뜻이다.
   */
  send?(text: string): void
  /**
   * 지금 올라와 있는 권한 질문에 허용/거부로 답한다 — 권한을 중계하는 러너만 구현한다.
   * 어느 질문인지는 러너가 안다: 질문은 한 번에 하나만 올라온다.
   * always 는 "이 세션에서는 다시 묻지 마라" — 같은 종류의 질문이 반복되지 않게 한다.
   */
  decide?(allow: boolean, always?: boolean): void
}

export type AgentRunner = {
  id: RunnerId
  label: string
  model: string
  start(prompt: string, sink: RunSink): RunHandle
}
