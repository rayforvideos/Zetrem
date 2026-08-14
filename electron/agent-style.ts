import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * 이 터미널에서 도는 에이전트의 정체성.
 *
 * 같은 `claude` 라도 Zetrem 에서 띄운 것은 이 책상의 식구다 — 이름이 있고, 상태줄이
 * 이 앱의 문법으로 서고, 말투도 이 화면에 맞는다. 순정 CLI 의 환영 배너를 지울 수는 없지만
 * (그건 CLI 의 것이다), 그 아래 사람이 실제로 오래 보는 것들은 우리가 정한다.
 *
 * 설정 파일 하나로 준다 — CLI 의 `--settings` 가 받는 형식이고, 사람이 이미 가진 개인 설정을
 * 덮지 않는다 (이 파일은 이 세션에만 얹힌다).
 */

/** 에이전트의 이름. 타일의 라벨과 상태줄에 같은 이름이 선다 */
export const AGENT_NAME = 'Zeta'

/** 상태줄에 서는 표식. 유리 위에서도 읽히는 한 글자 */
const AGENT_MARK = '◆'

export function agentSettingsPath(): string {
  return join(app.getPath('userData'), 'agent-style.json')
}

/**
 * 상태줄 — CLI 가 매 턴 stdin 으로 세션 JSON 을 주고, 출력 한 줄을 화면 아래에 붙인다.
 * 모델·디렉토리·브랜치를 우리 순서로 세운다: 정체성 → 자리 → 가지.
 */
function statusLineCommand(): string {
  return [
    "input=$(cat)",
    "model=$(printf '%s' \"$input\" | sed -n 's/.*\"display_name\":\"\\([^\"]*\\)\".*/\\1/p' | head -1)",
    "dir=$(basename \"$PWD\")",
    "branch=$(git branch --show-current 2>/dev/null)",
    `printf '${AGENT_MARK} ${AGENT_NAME}  %s  %s%s' "\${model:-claude}" "$dir" "\${branch:+  ⎇ $branch}"`,
  ].join('; ')
}

/**
 * 이 터미널 에이전트의 말투.
 *
 * 화면이 좁은 타일이라 첫 줄이 곧 요약이어야 한다 — 타일의 1층이 그 줄을 그대로 보여준다.
 */
function persona(): string {
  return [
    `당신은 Zetrem 의 터미널에서 도는 ${AGENT_NAME} 다.`,
    '답의 첫 줄은 지금 무엇을 하는지 한 문장으로 쓴다 — 그 줄이 화면 타일에 그대로 선다.',
    '서브에이전트를 띄울 때는 description 을 사람이 읽을 이름으로 짓는다 (타일의 이름이 된다).',
  ].join(' ')
}

/** 설정 파일을 써 두고 경로를 돌려준다. 셸의 `claude` 감싸개가 이 경로를 붙인다 */
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

export { persona }
