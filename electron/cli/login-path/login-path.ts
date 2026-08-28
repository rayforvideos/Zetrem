import { execFile } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const isWindows = process.platform === 'win32'

let cached: string | null = null
let pending: Promise<string> | null = null
let generation = 0
let remembered: string | null = null
let keep: ((path: string) => void) | null = null

export function resetLoginPath(): void {
  cached = null
  pending = null
  remembered = null
  generation += 1
}

// A login shell can take seconds; last launch's answer is used while the shell is asked again.
export function rememberLoginPath(path: string | null, save: (path: string) => void): void {
  remembered = path
  keep = save
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

function askTheShell(): Promise<string> {
  if (pending !== null) return pending
  const asked = generation
  pending = (async () => {
    const inherited = process.env.PATH ?? ''
    const found = isWindows ? inherited : await shellPath(inherited)
    const full = withKnownDirs(found, knownInstallDirs())
    if (asked === generation) {
      // A PATH with no claude on it is not an answer to keep: the person may
      // install it any minute, and the next look must find it.
      if (canFind('claude', full)) cached = full
      pending = null
      if (full !== remembered) {
        remembered = full
        keep?.(full)
      }
    }
    return full
  })()
  return pending
}

export async function loginPath(): Promise<string> {
  if (cached !== null) return cached
  if (remembered !== null && canFind('claude', remembered)) {
    cached = remembered
    void askTheShell()
    return cached
  }
  return askTheShell()
}

// The migrate-installer leaves the binary in ~/.claude/local and reaches it
// through a shell alias, so a working claude is not always on any PATH.
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
  // npm leaves claude, claude.cmd and claude.ps1 on Windows, and the bare one is
  // a shell script Windows cannot spawn. Resolve by PATHEXT the way Windows does
  // and keep the bare name last.
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
