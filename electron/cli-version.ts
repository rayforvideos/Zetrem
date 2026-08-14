import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { ipcMain } from 'electron'
import { managerOf } from '../src/entities/agent-session/model/cli-update'
import { agentEnv } from '../src/shared/lib/shell-env'
import { loginPath } from './login-path'

/**
 * CLI 의 최신 버전을 **읽기만** 한다.
 *
 * `claude update` 에는 dry-run 이 없다 (실측 2026-08-14: 옵션이 -h 뿐). npm 설치
 * 환경에서 그것을 주기적으로 돌리면 물었을 뿐인데 설치까지 해버리고, 도는 세션
 * 뒤에서 엔진이 바뀐다. 그래서 읽기는 레지스트리 조회로만 하고, 설치는 사람이
 * 버튼을 눌렀을 때만 시작한다.
 */
const REGISTRY = 'https://registry.npmjs.org/@anthropic-ai/claude-code/latest'

/** 네트워크가 없거나 느린 것은 오류가 아니다 — 모른다고 말하고 넘어간다 */
const FETCH_TIMEOUT_MS = 5000

/**
 * 설치가 이 시간을 넘기면 손을 뗀다.
 *
 * npm 설치는 느린 회선에서 1분을 넘길 수 있어 넉넉히 준다. 그래도 상한이 있어야 하는
 * 이유는 화면 쪽이다: 이 약속이 안 풀리면 서랍의 버튼이 "갱신 중…" 에 갇혀 되돌릴 길이
 * 없다. 시간이 다하면 사람이 손쓸 수 있는 다음 수(직접 돌리기)를 말로 남긴다.
 */
const UPDATE_TIMEOUT_MS = 180_000

/** `claude --version` 은 "2.1.231 (Claude Code)" 처럼 답한다 — 앞의 숫자만 취한다 */
const VERSION = /\d+(?:\.\d+)+/

/** 읽기만 하는 프로브의 상한 — 즉시 끝날 명령이라 짧게. 안 끝나면 모른다고 답한다 */
const PROBE_TIMEOUT_MS = 5000

/**
 * 자식이 낸 stdout 을 모아 돌려주되, 상한을 넘기면 거두고 `null` 을 답한다.
 *
 * 두 프로브(`claude --version`, `which claude`)가 같은 규칙을 쓴다. 상한이 필요한 이유는
 * 이 둘이 `cli:latest` 의 `Promise.all` 안에 있기 때문이다 — 하나가 매달리면 핸들러가
 * 통째로 매달리고, 그 경로는 앱이 뜰 때도 돌고 갱신 직후(바이너리를 막 갈아치워 첫 실행이
 * 멈칫하기 가장 쉬운 때)에도 돈다. `latestVersion` 의 fetch 상한과 같은 값을 쓴다.
 */
function probe(command: string, args: string[], path: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: agentEnv(process.env, path) })
    let out = ''
    // 약속은 한 번만 풀린다 — 상한 뒤에 도착하는 exit 가 두 번째로 풀지 않게
    let settled = false
    const settle = (value: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      settle(null)
    }, PROBE_TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8')
    })
    child.on('error', () => settle(null))
    child.on('exit', () => settle(out))
  })
}

async function latestVersion(): Promise<string | null> {
  try {
    const response = await fetch(REGISTRY, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) return null
    const body = (await response.json()) as { version?: unknown }
    return typeof body.version === 'string' ? body.version : null
  } catch {
    return null
  }
}

/** 실행 파일이 어디 사는지로 관리 주체를 안다. PATH 에서 못 찾으면 모른다 */
async function manager(): Promise<string | null> {
  const out = await probe('which', ['claude'], await loginPath())
  const found = out?.trim() ?? ''
  if (found.length === 0) return null
  try {
    // Homebrew 는 심볼릭 링크를 세워둔다 — 실제 자리를 봐야 Caskroom 이 보인다
    return managerOf(realpathSync(found))
  } catch {
    return managerOf(found)
  }
}

/**
 * **설치된** CLI 의 버전. 세션 init 의 `cliVersion` 은 지금 도는 프로세스의 것이라
 * 갱신을 마친 뒤에도 옛 값 그대로다 — 갱신이 끝났는지 알려면 디스크를 다시 물어야 한다.
 */
async function installedVersion(): Promise<string | null> {
  const out = await probe('claude', ['--version'], await loginPath())
  return out === null ? null : (VERSION.exec(out)?.[0] ?? null)
}

export function registerCliVersion(): void {
  ipcMain.handle('cli:latest', async () => {
    const [installed, latest, managedBy] = await Promise.all([
      installedVersion(),
      latestVersion(),
      manager(),
    ])
    return { installed, latest, managedBy }
  })

  /**
   * 사람이 누른 갱신. CLI 의 말을 그대로 돌려준다 —
   * Homebrew 가 관리하면 CLI 가 직접 그렇게 말하고 설치하지 않는다.
   * 우리가 `brew` 를 대신 돌리는 일은 없다: 시스템 패키지 관리자는 앱의 것이 아니다.
   */
  ipcMain.handle('cli:update', async () => {
    const path = await loginPath()
    return new Promise<{ output: string }>((resolve) => {
      const child = spawn('claude', ['update'], { env: agentEnv(process.env, path) })
      let output = ''
      const take = (chunk: Buffer): void => {
        output += chunk.toString('utf8')
      }
      // 약속은 한 번만 풀린다 — 시간이 다한 뒤 도착하는 exit 가 두 번째로 풀지 않게
      let settled = false
      const settle = (text: string): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ output: text })
      }
      const timer = setTimeout(() => {
        // 답 없는 자식을 남겨두면 설치가 뒤에서 계속 돌아 다음 갱신과 겹친다
        child.kill('SIGTERM')
        settle(
          `${output.trim().slice(-2000)}\n갱신이 3분 안에 끝나지 않아 멈췄습니다 — 터미널에서 claude update 를 직접 돌려 보세요`.trim(),
        )
      }, UPDATE_TIMEOUT_MS)
      child.stdout.on('data', take)
      child.stderr.on('data', take)
      child.on('error', () => settle('claude 명령을 찾지 못했습니다'))
      child.on('exit', () => settle(output.trim().slice(-2000)))
    })
  })
}
