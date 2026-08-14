import { execFile } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

let cached: string | null = null

export async function loginPath(): Promise<string> {
  if (cached !== null) return cached
  const shell = process.env.SHELL ?? '/bin/zsh'
  try {
    const { stdout } = await execFileAsync(shell, ['-ilc', 'printf %s "$PATH"'], {
      timeout: 8000,
      env: { HOME: process.env.HOME ?? '', SHELL: shell, TERM: 'dumb' },
    })
    const resolved = stdout.trim()
    cached = resolved.length > 0 && canFind('claude', resolved) ? resolved : (process.env.PATH ?? '')
  } catch {
    cached = process.env.PATH ?? ''
  }
  return cached
}

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
