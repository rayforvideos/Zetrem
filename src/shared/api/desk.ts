import type { RunConfig, Settings } from '@/entities/agent-session'
/**
 * 메인 프로세스가 preload 로 노출한 창구. electron/preload.ts 와 짝을 이룬다.
 *
 * 프로세스 경계라 타입을 공유할 수 없어 형태를 양쪽에 적는다.
 * 한쪽만 고치면 런타임에서야 드러나므로, 고칠 때 둘을 함께 본다.
 */
export type PickedBackdropFile = {
  /**
   * 이미지 원본 바이트. 경로가 아니라 바이트를 넘기는 이유는 아래 주석 참고.
   * `Blob` 이 `SharedArrayBuffer` 위의 뷰를 받지 않으므로 버퍼 종류를 못 박는다
   */
  bytes: Uint8Array<ArrayBuffer>
  /** blob 을 만들 때 붙일 MIME — 없으면 디코더를 고르지 못한다 */
  mime: string
}

/**
 * 경로 대신 바이트를 넘긴다.
 *
 * 개발 중 렌더러는 http://localhost 오리진에서 돌고, Chromium 은 http 오리진의
 * `file://` 접근을 `fetch` 와 `<img>` 양쪽에서 차단한다. 게다가 `file://` 은
 * 공백이나 `#` 이 든 경로를 이스케이프하지 않으면 그대로 깨진다.
 * 바이트를 받아 렌더러에서 `blob:` 을 만들면 두 문제가 함께 사라진다.
 */
/**
 * 메인 프로세스의 에이전트 호스트가 렌더러로 밀어 넣는 것.
 * 렌더러는 샌드박스라 프로세스를 못 띄우므로 spawn·stdio 는 전부 메인 소유이고,
 * 이 이벤트가 그 경계를 건너는 유일한 형태다.
 */
export type AgentHostEvent =
  | { id: string; kind: 'line'; line: string }
  /** 어느 자리에서 도는지 */
  | { id: string; kind: 'workspace'; cwd: string }
  | { id: string; kind: 'exit'; code: number | null }

export type AuthStatus = {
  loggedIn: boolean
  email?: string
  orgName?: string
  /** claude 명령을 찾지 못했다 — 설치 안내를 낸다 */
  missing?: boolean
}

export type DeskBridge = {
  pickBackdropFile(): Promise<PickedBackdropFile | null>
  /** 마지막으로 골랐던 배경을 다시 읽는다. 파일이 사라졌으면 null */
  restoreBackdropFile(): Promise<PickedBackdropFile | null>
  /**
   * 에이전트가 일할 프로젝트 디렉토리를 고른다. 경로는 메인이 기억하고
   * spawn cwd 로 직접 쓴다 — 렌더러가 임의 cwd 를 주입하는 창구는 두지 않는다
   */
  pickProjectDir(): Promise<string | null>
  restoreProjectDir(): Promise<string | null>
  closeWindow(): void
  /** CLI 에이전트를 메인 프로세스에서 띄운다. id 는 렌더러가 발급 */
  startAgent(id: string, prompt: string, config: RunConfig): Promise<void>
  /** 사람이 고른 것을 되읽는다 (권한 모드·모델·시작 여부) */
  readSettings(): Promise<Settings>
  /** 고른 것을 저장하고, 검증을 거친 결과를 돌려준다 */
  writeSettings(next: Settings): Promise<Settings>
  /** 로그인 상태. 자격 증명은 CLI 의 것이고 우리는 묻기만 한다 */
  authStatus(): Promise<AuthStatus>
  /** 브라우저 로그인을 띄우고, 끝나면 다시 물은 결과를 준다 */
  login(): Promise<AuthStatus>
  /** 로그인 진행 중 CLI 가 내는 줄 (URL 안내 등) */
  onAuthProgress(listener: (line: string) => void): () => void
  /** 도는 에이전트의 stdin 으로 사람의 말을 밀어 넣는다 */
  sendToAgent(id: string, text: string): void
  stopAgent(id: string): void
  /** 권한 질문에 판정을 돌려준다 (형태의 진실은 claude/parse.ts) */
  respondPermission(id: string, requestId: string, result: unknown): void
  /** 호스트 이벤트 구독. 반환값은 해지 함수 */
  onAgentEvent(listener: (event: AgentHostEvent) => void): () => void
  /**
   * 설치된 CLI 의 버전·최신 버전·관리 주체. 읽기만 한다 — 설치는 사람이 시작한다
   * (`claude update` 에는 dry-run 이 없어서다).
   *
   * `installed` 가 세션 init 의 `cliVersion` 과 따로 있는 이유: init 값은 **지금 도는
   * 프로세스**의 버전이라 갱신을 마쳐도 그대로다. 갱신이 반영됐는지는 디스크만 안다
   */
  latestCliVersion(): Promise<{
    installed: string | null
    latest: string | null
    managedBy: string | null
  }>
  /** 사람이 누른 갱신. CLI 가 낸 말을 그대로 돌려준다 */
  runCliUpdate(): Promise<{ output: string }>
}

declare global {
  interface Window {
    desk: DeskBridge
  }
}
