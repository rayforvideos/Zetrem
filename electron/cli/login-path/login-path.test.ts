import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  canFind,
  commandNames,
  findCommand,
  knownInstallDirs,
  loginPath,
  rememberLoginPath,
  resetLoginPath,
  withKnownDirs,
} from './login-path'

const windows = process.platform === 'win32'

describe('finding claude works differently on each machine', () => {
  it('looks for the plain name on macOS and Linux', () => {
    if (windows) return
    expect(commandNames('claude')).toEqual(['claude'])
  })

  it('splits PATH on the separator that machine uses', () => {
    const dirs = ['/nowhere-a', '/nowhere-b'].join(delimiter)
    expect(findCommand('definitely-not-a-real-binary', dirs)).toBeNull()
    expect(canFind('definitely-not-a-real-binary', dirs)).toBe(false)
  })

  it('skips an empty entry, so a trailing separator does not search the current folder', () => {
    expect(findCommand('claude', delimiter + delimiter)).toBeNull()
  })

  it('gives back an absolute path, because a bare name will not launch on Windows', () => {
    const found = findCommand(windows ? 'cmd' : 'sh', process.env.PATH ?? '')
    expect(found, 'this machine has a shell of some kind').not.toBeNull()
    expect(found).toContain(windows ? 'cmd' : 'sh')
    expect(found?.includes('/') || found?.includes('\\')).toBe(true)
  })
})

describe('an install the PATH never heard of', () => {
  // claude migrate-installer leaves the binary in ~/.claude/local and reaches
  // it through a shell alias, so no PATH entry ever points at it.
  const temps: string[] = []
  const fakeInstall = (): { home: string; bin: string } => {
    const home = mkdtempSync(join(tmpdir(), 'zetrem-home-'))
    temps.push(home)
    const dir = join(home, '.claude', 'local')
    mkdirSync(dir, { recursive: true })
    const bin = join(dir, 'claude')
    writeFileSync(bin, '#!/bin/sh\n')
    chmodSync(bin, 0o755)
    return { home, bin: dir }
  }

  afterEach(() => {
    while (temps.length > 0) rmSync(temps.pop() as string, { recursive: true, force: true })
  })

  it('knows the folders the installers use', () => {
    const dirs = knownInstallDirs('darwin', '/Users/someone')
    expect(dirs).toContain(join('/Users/someone', '.claude', 'local'))
    expect(dirs).toContain(join('/Users/someone', '.local', 'bin'))
  })

  it('appends the folder that really holds claude when PATH misses it', () => {
    if (windows) return
    const { bin } = fakeInstall()
    const path = withKnownDirs('/nowhere-a', [bin, '/nowhere-b'])
    expect(path).toBe(['/nowhere-a', bin].join(delimiter))
    expect(findCommand('claude', path)).toBe(join(bin, 'claude'))
  })

  it('leaves PATH alone when claude is already on it', () => {
    if (windows) return
    const { bin } = fakeInstall()
    expect(withKnownDirs(bin, ['/somewhere-else'])).toBe(bin)
  })

  it('leaves PATH alone when no known folder holds claude either', () => {
    expect(withKnownDirs('/nowhere-a', ['/nowhere-b'])).toBe('/nowhere-a')
  })

  it('reads PATH again after a reset, for the binary an install just wrote', async () => {
    if (windows) return
    const kept = { HOME: process.env.HOME, SHELL: process.env.SHELL, PATH: process.env.PATH }
    const home = mkdtempSync(join(tmpdir(), 'zetrem-home-'))
    temps.push(home)
    try {
      process.env.HOME = home
      process.env.SHELL = '/bin/false'
      process.env.PATH = '/nowhere-a'
      resetLoginPath()
      // The machine running this test may hold a real claude in /opt/homebrew
      // or /usr/local, so only the folder inside the throwaway home is judged.
      const dir = join(home, '.local', 'bin')
      expect(await loginPath()).not.toContain(dir)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'claude'), '#!/bin/sh\n')
      chmodSync(join(dir, 'claude'), 0o755)
      expect(await loginPath()).not.toContain(dir)
      resetLoginPath()
      expect((await loginPath()).split(delimiter)).toContain(dir)
    } finally {
      process.env.HOME = kept.HOME
      process.env.SHELL = kept.SHELL
      process.env.PATH = kept.PATH
      resetLoginPath()
    }
  })
})

describe('what Windows will actually run', () => {
  it('tries the extensions before the bare name, which Windows cannot execute', () => {
    const names = commandNames('claude', 'win32')
    expect(names.at(-1)).toBe('claude')
    expect(names.indexOf('claude.cmd')).toBeLessThan(names.indexOf('claude'))
    expect(names.indexOf('claude.exe')).toBeLessThan(names.indexOf('claude.cmd'))
  })

  it('leaves a POSIX machine with the one name it needs', () => {
    expect(commandNames('claude', 'darwin')).toEqual(['claude'])
  })

  it('picks the .cmd shim over the shell script npm leaves beside it', () => {
    // npm writes claude, claude.cmd and claude.ps1 into the same folder.
    const dir = mkdtempSync(join(tmpdir(), 'zetrem-path-'))
    for (const name of ['claude', 'claude.cmd', 'claude.ps1']) {
      writeFileSync(join(dir, name), '')
    }
    expect(findCommand('claude', dir, 'win32')).toBe(join(dir, 'claude.cmd'))
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('one shell answers everybody who asks at once', () => {
  afterEach(() => {
    rememberLoginPath(null, () => undefined)
    resetLoginPath()
  })

  it('hands the same promise to callers that arrive before the shell answers', async () => {
    resetLoginPath()
    const [a, b, c] = await Promise.all([loginPath(), loginPath(), loginPath()])
    expect(a).toBe(b)
    expect(b).toBe(c)
  }, 20_000)

  it('answers at once from a remembered path that still finds claude, and saves what the shell says', async () => {
    if (windows) return
    const real = process.env.PATH ?? ''
    if (!canFind('claude', real)) return
    const saved: string[] = []
    resetLoginPath()
    rememberLoginPath(real, (path) => saved.push(path))
    const started = Date.now()
    expect(await loginPath()).toBe(real)
    expect(Date.now() - started).toBeLessThan(200)
    await new Promise((settle) => setTimeout(settle, 9000))
    for (const path of saved) expect(canFind('claude', path)).toBe(true)
  }, 20_000)

  it('ignores a remembered path that no longer finds claude', async () => {
    const saved: string[] = []
    resetLoginPath()
    rememberLoginPath('/nowhere-at-all', (path) => saved.push(path))
    const found = await loginPath()
    expect(found).not.toBe('/nowhere-at-all')
  }, 20_000)
})
