/**
 * 어느 화면을 열 것인가 — 그리고 **아직 아무것도 열지 않을 때**는 언제인가.
 *
 * 이 앱은 세 가지를 물어보고 나서야 화면을 정한다: 설정 파일, 로그인 상태, 일할 프로젝트.
 * 셋 다 비동기이고, 특히 로그인은 CLI 를 프로세스로 띄워 묻기 때문에 수백 ms 가 걸린다.
 *
 * 규칙은 하나다: **"모른다" 를 "아니다" 로 읽지 않는다.** 모르는 동안 설정 화면을 그리면,
 * 이미 로그인해서 대화로 갈 사람에게 설정 화면이 한 번 번쩍이고 사라진다 — 한 프레임이
 * 거짓말을 하는 것이다 (2026-08-14 사용자 보고: "새로고침하면 설정화면 나왔다가 시작하는게
 * 어색해"). 그래서 셋 중 하나라도 모르는 동안은 어느 쪽도 열지 않고 기다린다.
 *
 * 답이 "아니다" 로 오는 것과 아직 안 온 것은 다르다 — 물어본 결과가 "로그인 안 됨" 이면
 * 그건 아는 것이고, 그때는 설정 화면이 정답이다. 그래서 각 관문은 값이 아니라
 * **알았는가** 를 따로 들고 온다. 실패해도 "알았다" 로 쳐야 기다림이 영원해지지 않는다.
 */
export type ScreenGate = 'holding' | 'setup' | 'conversation'

export type GateState = {
  /** 설정 파일을 다 읽었는가 */
  settingsLoaded: boolean
  /** 로그인 상태를 물어본 답이 왔는가 (실패로 왔어도 참) */
  authKnown: boolean
  /** 기억된 프로젝트를 되읽어봤는가 (없다는 답이어도 참) */
  projectKnown: boolean
  loggedIn: boolean
  hasProject: boolean
  /** 사람이 "이 설정으로 시작" 을 누른 적이 있는가 */
  setupDone: boolean
}

export function screenGate(state: GateState): ScreenGate {
  if (!state.settingsLoaded || !state.authKnown || !state.projectKnown) return 'holding'
  if (!state.setupDone || !state.loggedIn || !state.hasProject) return 'setup'
  return 'conversation'
}
