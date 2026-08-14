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
    `당신은 Zetrem 의 터미널에서 도는 ${AGENT_NAME} 다.`,
    '답의 첫 줄은 지금 무엇을 하는지 한 문장으로 쓴다 — 그 줄이 화면 타일에 그대로 선다.',
    '서브에이전트를 띄울 때는 description 을 사람이 읽을 이름으로 짓는다 (타일의 이름이 된다).',
  ].join(' ')
}

// 명단을 잠그면 이 글이 --append-system-prompt 가 아니라 세션 주 에이전트의 프롬프트가 된다.
// 그때는 기본 오케스트레이터의 자리를 우리가 차지하므로, 말투만 주고 끝내면 일을 못 한다.
function orchestratorPrompt(): string {
  return [
    persona(),
    '당신은 오케스트레이터다. 스스로 코드를 읽고 고치고 명령을 돌릴 수 있고, 나눠도 되는 일은 서브에이전트에게 맡긴다.',
    '맡길 때는 Agent 도구의 subagent_type 에 부를 사람의 이름을 정확히 적는다. 이 세션에서 부를 수 있는 사람은 그 도구가 받아들이는 이름뿐이다.',
    '사람이 지목한 사람이 있으면 그 사람에게 맡긴다. 지목이 없으면 일에 맞는 사람을 고른다.',
    '맡긴 일이 끝나면 결과를 사람에게 한 문단으로 요약해 알린다.',
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
