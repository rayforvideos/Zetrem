/**
 * 에이전트가 물려받는 환경.
 *
 * **허용 목록이다.** 처음에는 `CLAUDE_*` 만 걷어내는 금지 목록이었는데, 그 방식은 다음
 * 침입자를 늘 놓친다 — 실제로 놓쳤다: Orca 안의 셸에서 앱을 띄웠더니 `ORCA_*` 19개가
 * 그대로 흘러들어가 Orca 의 훅이 발동했고, Zetrem 에서 끝낸 작업의 알림이 Orca 에서 떴다
 * (2026-08-13 사용자 보고). 실측한 82개 변수를 훑어보니 그것 말고도:
 *
 * - `AI_AGENT`·`TERM_PROGRAM=Orca`·`__CFBundleIdentifier` — 남의 앱 정체가 그대로 전달
 * - `CODEX_HOME`·`OPENCODE_CONFIG_DIR` — 다른 에이전트의 설정 디렉토리
 * - `PYENV_VERSION=2.7.18`·`NVM_BIN`·`SDKMAN_DIR` — **에이전트가 쓸 도구를 바꿔 버린다**
 *
 * 두 프로세스는 아예 별개여야 하므로, 아는 것만 통과시킨다. 모르는 변수는 통과하지 않는다 —
 * 다음에 어떤 도구가 무엇을 심든 이 함수는 그대로다.
 */

/** 이름 그대로 통과하는 것 — 사람과 시스템의 것 */
const KEEP_EXACT = new Set([
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'PATH',
  'TMPDIR',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  // git 이 ssh 로 원격을 만질 때 필요하다
  'SSH_AUTH_SOCK',
  // macOS 가 프로세스마다 주는 것들. 없애면 일부 시스템 호출이 경고를 낸다
  'COMMAND_MODE',
  '__CF_USER_TEXT_ENCODING',
])

/** 접두사로 통과하는 것 — 인증과 망 설정 */
const KEEP_PREFIX = ['ANTHROPIC_', 'AWS_BEARER_TOKEN_BEDROCK', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']

/** 대소문자를 가리지 않고 보는 접두사 — 프록시는 소문자로도 온다 */
const KEEP_PREFIX_CI = ['http_proxy', 'https_proxy', 'no_proxy']

/** 우리가 정해서 얹는 것 */
const OURS: Record<string, string> = {
  // 편집기가 열리면 헤드리스 프로세스가 영원히 멈춘다 (git commit 등)
  GIT_EDITOR: 'true',
  // 우리가 띄운 자리라는 표식. 훅이나 스크립트가 필요하면 이것을 본다
  ZETREM: '1',
}

/**
 * @param source 앱이 물려받은 환경
 * @param loginPath 로그인 셸에서 얻은 PATH. 주면 이것을 쓴다 — Finder 로 띄운 앱의
 *   PATH 는 `/usr/bin:/bin` 수준이라 `claude` 를 못 찾는다. 어디서 띄웠든 같은 자리에서
 *   같은 도구를 쓰게 하는 것이 이 인자의 목적이다
 */
export function agentEnv(
  source: Record<string, string | undefined>,
  loginPath?: string,
): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    const keep =
      KEEP_EXACT.has(key) ||
      KEEP_PREFIX.some((prefix) => key.startsWith(prefix)) ||
      KEEP_PREFIX_CI.some((prefix) => lower.startsWith(prefix))
    if (keep) env[key] = value
  }
  if (loginPath && loginPath.length > 0) env.PATH = loginPath
  return { ...env, ...OURS }
}
