export type SessionStatus = 'working' | 'waiting' | 'done'

export type RunnerId = string

/**
 * 에이전트가 사람에게 묻는 도구 권한 질문.
 * 같은 waiting 이라도 턴 종료의 대기와는 답의 창구가 다르다 — 하나는 자유 문장이고,
 * 이것은 허용/거부 둘 중 하나로 CLI 제어 채널에 돌아간다.
 */
export type PermissionAsk = {
  requestId: string
  toolName: string
  /** 사람이 판단할 대상 한 줄 — "Bash mkdir demo" */
  line: string
}


export type AgentSession = {
  id: string
  runnerId: RunnerId
  /** 타일 상단에 그대로 찍히는 이름 (스펙 §6 — 정체성은 글자) */
  label: string
  model: string
  status: SessionStatus
  /** 1층 — 읽는 것 */
  headline: string
  /** 2층 — 흐르는 것 */
  stream: string[]
  /** 대화 전문 — 시선의 주인이 된 대기 타일이 펼쳐 보인다 */
  transcript: TranscriptEntry[]
  /** 3층 — 배경 텔레메트리 */
  tokens: number
  contextUsed: number
  startedAtMs: number
  /**
   * 대기 상태로 들어간 시각. 대기가 아니면 undefined.
   * 여럿이 동시에 기다릴 때 누가 먼저였는지 가리는 근거다 — 시선의 주인은 하나뿐이므로
   * 순서를 정할 무언가가 필요하다 (스펙 §6 시선 규칙).
   */
  waitingSinceMs?: number
  /** 세션이 남긴 작업의 행방. 있으면 타일은 자동으로 닫히지 않는다 */
  outcome?: WorkOutcome | null
  /** 답을 기다리는 권한 질문. 없으면 이 대기는 턴 종료의 대기다 */
  permission?: PermissionAsk | null
}

/** 2층 버퍼 상한. 넘으면 앞에서 버린다 — 읽으라고 있는 층이 아니다 */
export const STREAM_BUFFER = 80

/**
 * 대화 전문 한 마디. headline 이 "지금 읽을 한 줄" 이라면 이것은 잘리지 않은 원문이다 —
 * 대기 타일에 답하려면 에이전트가 실제로 물은 것을 읽을 수 있어야 한다.
 */
export type TranscriptEntry = {
  role: 'user' | 'assistant'
  text: string
}

/** 전문 버퍼 상한. 사람이 스크롤로 되짚을 만큼이면 된다 — 로그 보관소가 아니다 */
export const TRANSCRIPT_BUFFER = 200

/**
 * 세션이 남긴 작업의 행방. worktree 에 커밋이나 미커밋 변경이 남았을 때만 존재한다 —
 * 병합은 사람의 일이므로, 화면은 최소한 일이 어디 있는지는 말해야 한다.
 */
export type WorkOutcome = {
  branch: string
  commits: number
  dirtyFiles: number
}
