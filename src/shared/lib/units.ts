/**
 * 같은 값을 두 곳이 각자 포맷하고 있었다 — `datetime.ts` 를 낳은 것과 같은 이유로 여기 모은다.
 *
 * 토큰 수는 `agent-events` 의 압축 줄과 상태줄의 컨텍스트 칸이, 한도 이름은 대화의 한도
 * 사건과 상태줄의 한도 칸이 각각 한 벌씩 들고 있었다. 두 벌은 언제나 조용히 갈라진다:
 * 한쪽만 자릿수를 고치거나 새 kind 를 배우면, 같은 사실이 화면의 두 자리에서 다르게 읽힌다.
 */

/** 148231 → "148.2k" — 읽는 자리가 원하는 것은 정확한 수가 아니라 크기감이다 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`
  return `${(tokens / 1000).toFixed(1)}k`
}

/** 한도의 종류를 한글로 — 모르는 kind 는 그대로 통과시킨다 (거짓 이름을 지어내지 않는다) */
export function limitKindLabel(kind: string): string {
  if (kind === 'seven_day') return '7일'
  if (kind === 'five_hour') return '5시간'
  return kind
}
