import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type { RememberedPath } from '../../cli/login-path/login-path.types'
import { saveFile } from '../save-file/save-file'

function filePath(): string {
  return join(app.getPath('userData'), 'login-path.json')
}

export async function readLoginPath(): Promise<string | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath(), 'utf8')) as Partial<RememberedPath>
    return typeof parsed.path === 'string' && parsed.path.length > 0 ? parsed.path : null
  } catch {
    return null
  }
}

export function saveLoginPath(path: string): void {
  const kept: RememberedPath = { path }
  void saveFile(filePath(), JSON.stringify(kept)).catch(() => undefined)
}
