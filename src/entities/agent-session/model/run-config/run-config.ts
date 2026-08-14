import type { ModelChoice, PermissionMode, RunConfig } from './run-config.types'

import { agentsArgs } from '../roster-lock/roster-lock'
import type { Person, RosterLock } from '../roster-lock/roster-lock.types'

export const PERMISSION_MODES: { id: PermissionMode; label: string; hint: string }[] = [
  { id: 'ask', label: 'Ask first', hint: 'Asks before editing files or running commands' },
  {
    id: 'acceptEdits',
    label: 'Auto-edit',
    hint: 'Edits files freely, asks before running commands',
  },
  { id: 'bypass', label: 'Allow all', hint: 'Never asks. Anything can run' },
]

export const MODELS: { id: ModelChoice; label: string; hint: string }[] = [
  { id: 'default', label: 'Default', hint: 'Follows your account setting' },
  {
    id: 'fable',
    label: 'Fable',
    hint: 'The hardest problems. Turn it on once with /model fable in the Claude Code CLI',
  },
  { id: 'opus', label: 'Opus', hint: 'Complex work. Slower and pricier' },
  { id: 'sonnet', label: 'Sonnet', hint: 'Balanced for most tasks' },
  { id: 'haiku', label: 'Haiku', hint: 'Fast and cheap. Good for quick questions' },
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
  ]

  if (config.persona.length > 0) args.push('--append-system-prompt', config.persona)

  if (config.resume) args.push('--resume', config.resume)

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
