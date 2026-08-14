import { agentsArgs } from './roster-lock'
import type { Person, RosterLock } from './roster-lock'

export type PermissionMode = 'ask' | 'acceptEdits' | 'bypass'

export type ModelChoice = 'default' | 'opus' | 'sonnet' | 'haiku'

export type RunConfig = {
  permissionMode: PermissionMode
  model: ModelChoice
  persona: string
  /** 명단을 잠글 때 세션 주 에이전트가 받는 프롬프트. 말투(persona)보다 길다 */
  orchestrator?: string
  /** 이 앱이 들인 사람들. 세션마다 실려 간다 */
  people: Person[]
  lock: RosterLock | null
}

export const PERMISSION_MODES: { id: PermissionMode; label: string; hint: string }[] = [
  { id: 'ask', label: '물어보기', hint: '파일 수정·명령 실행 전에 카드로 승인을 받습니다' },
  {
    id: 'acceptEdits',
    label: '편집은 자동',
    hint: '파일 편집은 그냥 하고, 명령 실행은 물어봅니다',
  },
  { id: 'bypass', label: '전부 허용', hint: '묻지 않습니다. 무엇이든 실행할 수 있습니다' },
]

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
    '--forward-subagent-text',
    '--append-system-prompt',
    config.persona,
  ]

  args.push(...agentsArgs(config.people, config.lock, config.orchestrator ?? config.persona))

  if (config.model !== 'default') args.push('--model', config.model)

  if (config.permissionMode === 'bypass') {
    args.push('--dangerously-skip-permissions')
    return args
  }

  if (config.permissionMode === 'acceptEdits') args.push('--permission-mode', 'acceptEdits')
  args.push('--permission-prompt-tool', 'stdio')
  return args
}

export function isReady(state: { loggedIn: boolean; project: string | null }): boolean {
  return state.loggedIn && state.project !== null
}
