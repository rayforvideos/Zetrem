import { execFile } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * 로그인 셸의 PATH.
 *
 * 앱을 어디서 띄웠느냐에 따라 PATH 가 다르면 에이전트가 쓰는 도구도 달라진다 —
 * Finder 로 띄운 GUI 앱의 PATH 는 `/usr/bin:/bin` 수준이라 `claude` 조차 못 찾고,
 * 터미널에서 띄우면 그 셸의 도구 체인이 통째로 딸려 온다. 둘 다 "우리가 정한 자리" 가
 * 아니므로, 사람의 로그인 셸에게 한 번 물어 그것을 쓴다.
 *
 * 한 번만 묻는다 — 셸 초기화는 느리고, 앱이 도는 동안 바뀌지 않는다.
 */
let cached: string | null = null

export async function loginPath(): Promise<string> {
  if (cached !== null) return cached
  const shell = process.env.SHELL ?? '/bin/zsh'
  try {
    // `-i` 가 필요하다: 사람들이 PATH 를 .zshrc(대화형 설정)에 쓰기 때문이다.
    // `-l` 만 주면 .zprofile 만 읽어 nvm·pyenv·전역 npm 이 빠지고, 그러면 claude 를 못 찾는다
    // (2026-08-13 실측: 그렇게 해서 "claude 명령을 찾지 못했습니다" 가 떴다)
    const { stdout } = await execFileAsync(shell, ['-ilc', 'printf %s "$PATH"'], {
      timeout: 8000,
      // 셸에게도 깨끗한 환경을 준다 — 남의 ZDOTDIR 로 남의 설정을 읽으면 안 된다
      env: { HOME: process.env.HOME ?? '', SHELL: shell, TERM: 'dumb' },
    })
    const resolved = stdout.trim()
    // 물어본 PATH 로 claude 를 실제로 찾을 수 있는지 확인한다 — 없으면 물려받은 쪽이 낫다
    cached = resolved.length > 0 && canFind('claude', resolved) ? resolved : (process.env.PATH ?? '')
  } catch {
    // 못 물으면 물려받은 것을 쓴다 — 없는 것보다 낫다
    cached = process.env.PATH ?? ''
  }
  return cached
}

/** 이 PATH 로 그 명령을 실제로 찾을 수 있는가 */
function canFind(command: string, path: string): boolean {
  return path.split(':').some((dir) => {
    if (dir.length === 0) return false
    try {
      accessSync(join(dir, command), constants.X_OK)
      return true
    } catch {
      return false
    }
  })
}
