import { execFile } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const isWindows = process.platform === 'win32'

let cached: string | null = null

export async function loginPath(): Promise<string> {
  if (cached !== null) return cached
  const inherited = process.env.PATH ?? ''

  if (isWindows) {
    cached = inherited
    return cached
  }

  const shell = process.env.SHELL ?? '/bin/zsh'
  try {
    const { stdout } = await execFileAsync(shell, ['-ilc', 'printf %s "$PATH"'], {
      timeout: 8000,
      env: { HOME: process.env.HOME ?? '', SHELL: shell, TERM: 'dumb' },
    })
    const resolved = stdout.trim()
    cached = resolved.length > 0 && canFind('claude', resolved) ? resolved : inherited
  } catch {
    cached = inherited
  }
  return cached
}

export function commandNames(command: string, platform: string = process.platform): string[] {
  if (platform !== 'win32') return [command]
  // npm leaves three files behind on Windows: claude, claude.cmd and claude.ps1.
  // The bare one is a shell script that Windows cannot run, and it used to be
  // tried first, so the app resolved a file it could not spawn. Windows itself
  // resolves by PATHEXT, so follow that and keep the bare name as a last resort.
  const exts = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((ext) => ext.trim())
    .filter((ext) => ext.startsWith('.'))
  return [...exts.map((ext) => `${command}${ext.toLowerCase()}`), command]
}

export function findCommand(
  command: string,
  path: string,
  platform: string = process.platform,
): string | null {
  const names = commandNames(command, platform)
  for (const dir of path.split(delimiter)) {
    if (dir.length === 0) continue
    for (const name of names) {
      const full = join(dir, name)
      try {
        accessSync(full, platform === 'win32' ? constants.F_OK : constants.X_OK)
        return full
      } catch {
        continue
      }
    }
  }
  return null
}

export function canFind(command: string, path: string): boolean {
  return findCommand(command, path) !== null
}

export async function claudeBin(): Promise<string> {
  return findCommand('claude', await loginPath()) ?? 'claude'
}
