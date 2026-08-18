import type { RunConfig } from './run-config.types'

import { agentsArgs } from '../roster-lock/roster-lock'

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

export const PROBE_PROMPT = 'hi'
export const PROBE_BUDGET_USD = '0.0001'

export function probeArgs(config: RunConfig): string[] {
  const args = agentArgs({ ...config, resume: null })
  const format = args.indexOf('--input-format')
  if (format !== -1) args.splice(format, 2)
  args.splice(args.indexOf('-p') + 1, 0, PROBE_PROMPT)
  return [...args, '--max-budget-usd', PROBE_BUDGET_USD]
}

export function isReady(state: { loggedIn: boolean; project: string | null }): boolean {
  return state.loggedIn && state.project !== null
}
