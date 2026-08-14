/**
 * 프로세스 혈통 — "이 세션이 우리 터미널에서 시작됐는가" 를 가리는 근거다.
 *
 * 기록(jsonl)에는 누가 띄웠는지가 남지 않는다. 그래서 앱은 파일을 붙들고 있는 프로세스가
 * 앱 터미널의 셸에서 갈라져 나왔는지로 소유를 판정한다. 순수 함수 — ps 도 lsof 도 모른다.
 */
export type ProcessRow = { pid: number; ppid: number }

/** `ps -eo pid,ppid` 의 출력 한 덩이를 행으로 만든다 */
export function parsePsRows(stdout: string): ProcessRow[] {
  const rows: ProcessRow[] = []
  for (const line of stdout.split('\n')) {
    const matched = line.trim().match(/^(\d+)\s+(\d+)$/)
    if (!matched) continue
    rows.push({ pid: Number(matched[1]), ppid: Number(matched[2]) })
  }
  return rows
}

/**
 * 뿌리에서 뻗어 나온 모든 pid (뿌리 자신 포함).
 * 손자까지 따라가는 이유: 셸 → claude → 서브에이전트 프로세스가 모두 우리 것이다.
 */
export function descendantsOf(rows: ProcessRow[], rootPid: number): Set<number> {
  const childrenOf = new Map<number, number[]>()
  for (const row of rows) {
    const siblings = childrenOf.get(row.ppid)
    if (siblings) siblings.push(row.pid)
    else childrenOf.set(row.ppid, [row.pid])
  }

  const found = new Set<number>([rootPid])
  const queue = [rootPid]
  while (queue.length > 0) {
    const current = queue.pop()!
    for (const child of childrenOf.get(current) ?? []) {
      // 이미 본 pid 는 다시 담지 않는다 — ps 가 경합 중에 고리를 내도 여기서 멈춘다
      if (found.has(child)) continue
      found.add(child)
      queue.push(child)
    }
  }
  return found
}

/**
 * 지금 도는 세션 id 들.
 *
 * 터미널의 `claude` 감싸개가 `--session-id <uuid>` 를 붙이므로 그 uuid 가 프로세스
 * 명령줄에 그대로 남는다 (실측). 그래서 "이 세션이 아직 살아 있는가" 를 여기서 답할 수 있다 —
 * 기록에는 끝났다는 표시가 없어서, 이것이 없으면 타일이 영원히 닫히지 않는다.
 */
export function runningSessionIds(psOutput: string): Set<string> {
  const found = new Set<string>()
  const pattern = /--session-id[= ]+([0-9a-fA-F-]{36})/g
  for (const match of psOutput.matchAll(pattern)) {
    // 기록 파일 이름은 소문자다 — 맞춰 눕혀야 이어 붙는다
    found.add(match[1]!.toLowerCase())
  }
  return found
}
