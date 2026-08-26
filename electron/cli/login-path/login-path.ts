import { execFile } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const isWindows = process.platform === 'win32'

let cached: string | null = null

// An install that just finished wrote a binary the cached answer predates.
export function resetLoginPath(): void {
  cached = null
}

async function shellPath(inherited: string): Promise<string> {
  const shell = process.env.SHELL ?? '/bin/zsh'
  try {
    const { stdout } = await execFileAsync(shell, ['-ilc', 'printf %s "$PATH"'], {
      timeout: 8000,
      env: { HOME: process.env.HOME ?? '', SHELL: shell, TERM: 'dumb' },
    })
    const resolved = stdout.trim()
    return resolved.length > 0 && canFind('claude', resolved) ? resolved : inherited
  } catch {
    return inherited
  }
}

export async function loginPath(): Promise<string> {
  if (cached !== null) return cached
  const inherited = process.env.PATH ?? ''
  const found = isWindows ? inherited : await shellPath(inherited)
  cached = withKnownDirs(found, knownInstallDirs())
  return cached
}

// A working claude is not always on any PATH: the migrate-installer leaves the
// binary in ~/.claude/local and reaches it through a shell alias, and when the
// login-shell probe above fails, a packaged app is left with the bare GUI PATH.
// These are the folders the installers actually write to.
export function knownInstallDirs(
  platform: string = process.platform,
  home: string = homedir(),
): string[] {
  if (platform === 'win32') {
    const appData = process.env.APPDATA
    return [join(home, '.local', 'bin'), ...(appData ? [join(appData, 'npm')] : [])]
  }
  return [
    join(home, '.claude', 'local'),
    join(home, '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ]
}

export function withKnownDirs(
  path: string,
  dirs: string[],
  platform: string = process.platform,
): string {
  if (findCommand('claude', path, platform) !== null) return path
  const holding = dirs.filter((dir) => findCommand('claude', dir, platform) !== null)
  if (holding.length === 0) return path
  return [...path.split(delimiter).filter((dir) => dir.length > 0), ...holding].join(delimiter)
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
        // Not there, or there and not runnable. The next name and the next dir get a turn.
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
