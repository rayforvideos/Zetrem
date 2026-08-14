/**
 * 줄 단위 diff — 의존성을 늘리지 않기 위해 직접 쓴다.
 *
 * 우리가 비교하는 것은 파일 전체가 아니라 Edit 이 준 두 덩어리(old_string / new_string)다.
 * 그래서 최장공통부분수열 같은 것이 필요하지 않다: 앞뒤로 같은 줄을 깎아내고
 * 남은 가운데를 통째로 -/+ 로 낸다. 사람이 보려는 것은 "무엇이 바뀌었나" 하나다.
 */
export type DiffLine = { kind: 'add' | 'remove' | 'same'; text: string }

/** 바뀐 자리 위아래로 남길 같은 줄의 수 */
const CONTEXT = 3

export function lineDiff(before: string, after: string, context = CONTEXT): DiffLine[] {
  if (before.length === 0 && after.length === 0) return []
  const a = before.length === 0 ? [] : before.split('\n')
  const b = after.length === 0 ? [] : after.split('\n')

  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1

  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail += 1
  }

  const out: DiffLine[] = []
  const headShown = Math.min(head, context)
  // 앞이 길게 같으면 잘렸다는 사실을 한 줄로 알린다 — 조용히 없어지면 화면이 거짓말한다
  if (head > headShown) out.push({ kind: 'same', text: '…' })
  for (const text of a.slice(head - headShown, head)) out.push({ kind: 'same', text })

  for (const text of a.slice(head, a.length - tail)) out.push({ kind: 'remove', text })
  for (const text of b.slice(head, b.length - tail)) out.push({ kind: 'add', text })

  const tailShown = Math.min(tail, context)
  for (const text of a.slice(a.length - tail, a.length - tail + tailShown)) {
    out.push({ kind: 'same', text })
  }
  if (tail > tailShown) out.push({ kind: 'same', text: '…' })

  return out
}
