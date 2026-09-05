import type { RunConfig } from './run-config.types'

import { agentsArgs } from '@/entities/claude-cli/api/roster-lock/roster-lock'

// A subagent worktree branches from the repository's default branch by default,
// and the work the person is looking at sits on their HEAD instead.
const WORKTREE_FROM_HEAD = '{"worktree":{"baseRef":"head"}}'

export function agentArgs(config: RunConfig): string[] {
  const args = [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--forward-subagent-text',
    // Without this the CLI sends nothing between the question and the finished
    // answer, so a long reply lands in one piece and the window looks stuck.
    '--include-partial-messages',
  ]

  if (config.persona.length > 0) args.push('--append-system-prompt', config.persona)

  if (config.resume) args.push('--resume', config.resume)

  const isolated = config.isolated === true
  args.push(
    ...agentsArgs(
      config.people,
      config.lock,
      config.orchestrator ?? config.persona,
      isolated,
      config.spoken,
    ),
  )
  if (isolated) args.push('--settings', WORKTREE_FROM_HEAD)

  if (config.model !== 'default') args.push('--model', config.model)
  if (config.effort !== 'default') args.push('--effort', config.effort)

  // Only the on switch is spoken. Measured on CLI 2.1.260: a run with no chrome
  // flag reports the same empty mcp_servers and tool list as one given
  // --no-chrome, so silence already means off and saying it again would only
  // put a second meaning on the same state.
  if (config.chrome === true) args.push('--chrome')

  if (config.permissionMode === 'bypass') {
    args.push('--dangerously-skip-permissions')
    return args
  }

  // Every mode left here is a word the CLI knows by the same name, and each of
  // them still asks, so the prompt tool below stays.
  if (config.permissionMode !== 'ask') args.push('--permission-mode', config.permissionMode)
  args.push('--permission-prompt-tool', 'stdio')
  return args
}

export const PROBE_PROMPT = 'hi'
export const PROBE_BUDGET_USD = '0.0001'

export function probeArgs(config: RunConfig): string[] {
  const args = agentArgs({ ...config, resume: null })
  const format = args.indexOf('--input-format')
  if (format !== -1) args.splice(format, 2)
  // Nobody reads a probe as it is written, and the token stream is the bulk of
  // what a run says.
  const partial = args.indexOf('--include-partial-messages')
  if (partial !== -1) args.splice(partial, 1)
  args.splice(args.indexOf('-p') + 1, 0, PROBE_PROMPT)
  return [...args, '--max-budget-usd', PROBE_BUDGET_USD]
}

export function isReady(state: { loggedIn: boolean; project: string | null }): boolean {
  return state.loggedIn && state.project !== null
}
