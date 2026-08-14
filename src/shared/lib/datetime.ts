/**
 * 초기화 시각 하나를 두 곳(상태줄 칸, 대화의 한도 사건)이 각자 포맷하고 있었다 —
 * 같은 값을 두 벌로 읽으면 언젠가 어긋난다. `toLocaleString('ko-KR', ...)` 은
 * "8. 20. 오전 06:00" 처럼 마침표를 겹쳐 찍고 불필요한 오전/오후를 붙이므로,
 * 숫자만 `en-CA` 로 뽑아 한글 조사를 직접 붙인다.
 */
export function formatResetTime(ms: number, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  // en-CA 는 'numeric' 이라도 월·일을 0으로 채워 준다 — 시·분과 달리 여기는 채우지 않는다
  const strip = (value: string) => value.replace(/^0/, '')
  return `${strip(get('month'))}월 ${strip(get('day'))}일 ${get('hour')}:${get('minute')}`
}
