import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

export const AGENT_NAME = 'Zeta'

const AGENT_MARK = '◆'

export function agentSettingsPath(): string {
  return join(app.getPath('userData'), 'agent-style.json')
}

function statusLineCommand(): string {
  return [
    "input=$(cat)",
    "model=$(printf '%s' \"$input\" | sed -n 's/.*\"display_name\":\"\\([^\"]*\\)\".*/\\1/p' | head -1)",
    "dir=$(basename \"$PWD\")",
    "branch=$(git branch --show-current 2>/dev/null)",
    `printf '${AGENT_MARK} ${AGENT_NAME}  %s  %s%s' "\${model:-claude}" "$dir" "\${branch:+  ⎇ $branch}"`,
  ].join('; ')
}

function persona(): string {
  return [
    `You are ${AGENT_NAME}, running in Zetrem's terminal.`,
    'Open every reply with one sentence saying what you are doing right now — that line is shown verbatim on the screen tile.',
    'When you spawn a subagent, write its description as a human-readable name (it becomes the tile name).',
  ].join(' ')
}

function orchestratorPrompt(): string {
  return [
    persona(),
    'You are the orchestrator. You can read code, edit it, and run commands yourself, and you hand off work that can be split to subagents.',
    "When handing off, put the exact teammate name in the Agent tool's subagent_type. The only names callable this session are the ones that tool accepts.",
    'If the user named someone, give the work to that teammate. If not, pick whoever fits the job.',
    'When handed-off work finishes, summarize the result for the user in one paragraph.',
  ].join(' ')
}

export async function writeAgentSettings(): Promise<string> {
  const path = agentSettingsPath()
  await mkdir(app.getPath('userData'), { recursive: true }).catch(() => undefined)
  await writeFile(
    path,
    JSON.stringify(
      {
        statusLine: { type: 'command', command: statusLineCommand(), padding: 0 },
      },
      null,
      2,
    ),
    'utf8',
  )
  return path
}

export { orchestratorPrompt, persona }
