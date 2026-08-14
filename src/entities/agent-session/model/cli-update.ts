/**
 * CLI 버전 비교 — 순수 함수. 이 채널의 버전은 `2.1.231` 형태의 세 자리 점 표기뿐이라
 * prerelease·build 태그까지 다루는 일반 semver 파서는 여기서 만들지 않는다 (YAGNI).
 */

/** "2.1.231" → [2, 1, 231]. 정수로 못 읽으면 null — 모르는 것을 지어내지 않는다 */
function parse(version: string): number[] | null {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => Number.isNaN(part))) return null
  return parts
}

/**
 * current 가 latest 보다 뒤인가. 어느 쪽이든 읽을 수 없으면 false —
 * 읽지 못한 버전을 "새 버전 있음" 으로 오인해 경보를 울리면 안 된다.
 */
export function isOutdated(current: string | null, latest: string | null): boolean {
  if (current === null || latest === null) return false
  const a = parse(current)
  const b = parse(latest)
  if (a === null || b === null) return false
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x < y
  }
  return false
}

/** 실행 경로로 이 CLI 를 누가 관리하는지 알아낸다 — 갱신을 어디에 부탁해야 하는지 */
export function managerOf(binaryPath: string): string | null {
  if (binaryPath.includes('/Caskroom/')) return 'Homebrew'
  if (binaryPath.includes('/node_modules/')) return 'npm'
  return null
}
