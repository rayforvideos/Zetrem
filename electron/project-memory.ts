import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * 마지막 프로젝트 경로의 기억. main(다이얼로그)과 agent-host(spawn cwd)가 함께 쓴다 —
 * 렌더러에 cwd 주입 창구를 열지 않기 위해 경로의 진실은 메인 쪽 파일 하나다.
 */
function memoryPath(): string {
  return join(app.getPath('userData'), 'project.json')
}

export async function rememberProject(path: string): Promise<void> {
  await writeFile(memoryPath(), JSON.stringify({ path }), 'utf8').catch(() => undefined)
}

/** 기억이 없거나 디렉토리가 사라졌으면 null — 오류가 아니다 */
export async function recallProject(): Promise<string | null> {
  try {
    const memory = JSON.parse(await readFile(memoryPath(), 'utf8')) as { path?: string }
    if (typeof memory.path !== 'string' || !existsSync(memory.path)) return null
    return memory.path
  } catch {
    return null
  }
}
