import type { ModelChoice, PermissionMode } from './run-config'

/**
 * 사람이 첫 화면에서 고른 것. 다음에 켤 때도 그대로여야 한다 —
 * 매번 다시 고르게 하면 그것은 선택이 아니라 잔소리다.
 *
 * `setupDone` 이 따로 있는 이유: 프로젝트가 기억돼 있다는 것과 "이 설정으로 시작하겠다"
 * 는 다른 말이다. 앞의 것만 보고 대화를 열면 사람이 권한 모드를 고르기도 전에 앱이
 * 일할 준비를 마쳐 버린다 (2026-08-13 사용자 보고).
 */
export type Settings = {
  permissionMode: PermissionMode
  model: ModelChoice
  setupDone: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  // 처음 켠 사람에게 "전부 허용" 을 기본으로 줄 수는 없다 — 그건 사람이 정하는 것이다
  permissionMode: 'ask',
  model: 'default',
  setupDone: false,
}

const PERMISSION_MODES: PermissionMode[] = ['ask', 'acceptEdits', 'bypass']
const MODELS: ModelChoice[] = ['default', 'opus', 'sonnet', 'haiku']

/** 저장된 것을 되읽는다. 모르는 값은 기본으로 — 손상된 파일이 이상한 모드를 켜지 못하게 */
export function readSettings(saved: unknown): Settings {
  if (typeof saved !== 'object' || saved === null) return DEFAULT_SETTINGS
  const source = saved as Record<string, unknown>
  return {
    permissionMode: PERMISSION_MODES.includes(source.permissionMode as PermissionMode)
      ? (source.permissionMode as PermissionMode)
      : DEFAULT_SETTINGS.permissionMode,
    model: MODELS.includes(source.model as ModelChoice)
      ? (source.model as ModelChoice)
      : DEFAULT_SETTINGS.model,
    setupDone: source.setupDone === true,
  }
}
