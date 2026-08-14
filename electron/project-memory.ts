import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

function memoryPath(): string {
  return join(app.getPath('userData'), 'project.json')
}

export async function rememberProject(path: string): Promise<void> {
  await writeFile(memoryPath(), JSON.stringify({ path }), 'utf8').catch(() => undefined)
}

export async function recallProject(): Promise<string | null> {
  try {
    const memory = JSON.parse(await readFile(memoryPath(), 'utf8')) as { path?: string }
    if (typeof memory.path !== 'string' || !existsSync(memory.path)) return null
    return memory.path
  } catch {
    return null
  }
}
