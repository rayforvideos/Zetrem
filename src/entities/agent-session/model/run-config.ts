/**
 * 무엇을 들고 claude 를 띄우는가.
 *
 * 사람이 첫 화면에서 고르는 것들(권한 모드·모델)이 여기서 CLI 인자가 된다.
 * 순수 함수 — 프로세스도 IPC 도 모른다. 조합의 정합성은 테스트가 지킨다:
 * 특히 `--dangerously-skip-permissions` 와 `--permission-prompt-tool` 은 함께 줄 수 없다.
 */
export type PermissionMode = 'ask' | 'acceptEdits' | 'bypass'

export type ModelChoice = 'default' | 'opus' | 'sonnet' | 'haiku'

export type RunConfig = {
  permissionMode: PermissionMode
  model: ModelChoice
  /** 이 앱의 에이전트에게 주는 말투 */
  persona: string
}

/** 사람이 고르는 세 갈래. 라벨과 한 줄 설명이 그대로 화면에 선다 */
export const PERMISSION_MODES: { id: PermissionMode; label: string; hint: string }[] = [
  { id: 'ask', label: '물어보기', hint: '파일 수정·명령 실행 전에 카드로 승인을 받습니다' },
  {
    id: 'acceptEdits',
    label: '편집은 자동',
    hint: '파일 편집은 그냥 하고, 명령 실행은 물어봅니다',
  },
  { id: 'bypass', label: '전부 허용', hint: '묻지 않습니다. 무엇이든 실행할 수 있습니다' },
]

/**
 * 모델은 비용·속도·품질을 한 번에 정하는 선택이다. 이름만 늘어놓으면 고르는 사람은
 * 무엇을 정하는지 모른다 — 그래서 각자 한 줄을 들고 있다.
 */
export const MODELS: { id: ModelChoice; label: string; hint: string }[] = [
  { id: 'default', label: '기본', hint: '계정 설정을 따릅니다' },
  { id: 'opus', label: 'Opus', hint: '가장 똑똑합니다. 느리고 비쌉니다' },
  { id: 'sonnet', label: 'Sonnet', hint: '대부분의 일에 균형이 맞습니다' },
  { id: 'haiku', label: 'Haiku', hint: '빠르고 쌉니다. 간단한 일에' },
]

export function agentArgs(config: RunConfig): string[] {
  const args = [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    // 글자가 흐르지 않으면 기다림이 정지처럼 보인다 — 델타를 stream_event 로 받는다
    '--include-partial-messages',
    // 서브에이전트의 말과 도구 활동이 parent 표식을 달고 나온다 — 자식 타일의 재료
    '--forward-subagent-text',
    '--append-system-prompt',
    config.persona,
  ]

  if (config.model !== 'default') args.push('--model', config.model)

  if (config.permissionMode === 'bypass') {
    // 묻는 창구와 함께 줄 수 없다 — CLI 가 거부한다. 사람이 "묻지 마라" 를 고른 것이다
    args.push('--dangerously-skip-permissions')
    return args
  }

  if (config.permissionMode === 'acceptEdits') args.push('--permission-mode', 'acceptEdits')
  // 나머지 판단은 우리 카드로 온다 (스펙 2026-08-13 권한 중계)
  args.push('--permission-prompt-tool', 'stdio')
  return args
}

/** 일을 맡길 수 있는 상태인가 — 로그인과 일할 자리가 모두 있어야 한다 */
export function isReady(state: { loggedIn: boolean; project: string | null }): boolean {
  return state.loggedIn && state.project !== null
}
