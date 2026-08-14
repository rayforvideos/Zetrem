import type { AgentSession } from '@/entities/agent-session'

/**
 * 능동적으로 시선을 끌 타일 하나를 고른다 (스펙 §6 시선 규칙 — 하드 제약).
 *
 * 러너가 여섯 개를 같은 틱에 대기로 밀어 넣어도 화면은 하나만 강조해야 한다.
 * 여섯이 동시에 시선을 끌면 그 규칙은 없는 것과 같다. 그래서 이 판정은 **셸의 것**이다 —
 * 러너에게 맡기면 러너 수만큼 규칙이 생기고, 그중 하나만 어겨도 규칙이 무너진다.
 *
 * 여럿이 기다리면 가장 오래 기다린 하나. 같은 순간에 들어갔거나 시각을 모르는 세션은
 * 목록 순서(= 띄운 순서)로 가른다 — 판정은 언제나 하나로 정해져야 한다.
 */
export function attentionId(sessions: AgentSession[]): string | null {
  let chosen: AgentSession | undefined
  for (const session of sessions) {
    if (session.status !== 'waiting') continue
    if (chosen === undefined || waitingSince(session) < waitingSince(chosen)) chosen = session
  }
  return chosen?.id ?? null
}

/** 대기 시각을 모르는 세션은 뒤로 미룬다 — 아는 쪽이 먼저 기다렸다고 볼 근거가 있다 */
function waitingSince(session: AgentSession): number {
  return session.waitingSinceMs ?? Number.POSITIVE_INFINITY
}
