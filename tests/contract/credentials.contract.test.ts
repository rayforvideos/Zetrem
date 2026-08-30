import { execFile } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { mkdtemp, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  KEYCHAIN_SERVICE,
  readSnapshot,
  writeSnapshot,
} from '../../electron/cli/credentials/credentials'
import type { CredentialIo } from '../../electron/cli/credentials/credentials.types'
import { saveSecretFile } from '../../electron/store/save-file/save-file'

const PROBE_SERVICE = 'Zetrem contract probe'
const isDarwin = process.platform === 'darwin'

function run(command: string, args: string[], stdin?: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = execFile(
      command,
      args,
      { windowsHide: true, timeout: 20_000 },
      (cause, stdout) => (cause === null ? resolve(stdout) : reject(cause)),
    )
    child.stdin?.end(stdin ?? '')
  })
}

async function deleteProbeItem(): Promise<void> {
  await run('security', ['delete-generic-password', '-s', PROBE_SERVICE]).catch(() => '')
}

// Maps the real service name to the probe name for every argument, and
// refuses to run `security` at all if the real name is still anywhere in one
// after that mapping — the one thing this file may never risk. The check is by
// substring, not equality: a `-s=<service>` or labelled form would slip past a
// mapping that only rewrites a whole argument, and `add-generic-password -U`
// would then overwrite the developer's own Claude Code login with a fake token.
// The real ~/.claude always exists already; a fresh probe dir does not.
function probeIo(configDir: string): CredentialIo {
  mkdirSync(configDir, { recursive: true })
  return {
    platform: process.platform,
    user: process.env.USER ?? 'contract-test',
    configDir,
    // A probe dir stands in for CLAUDE_CONFIG_DIR, and with that set the CLI
    // keeps the name inside it rather than in the home root.
    labelPath: join(configDir, '.claude.json'),
    exec(command, args, stdin) {
      const mapped = args.map((arg) => (arg === KEYCHAIN_SERVICE ? PROBE_SERVICE : arg))
      if (mapped.some((arg) => arg.includes(KEYCHAIN_SERVICE))) {
        throw new Error('refusing to run security: the real keychain service name is still present')
      }
      return run(command, mapped, stdin)
    },
    readFile: (path) => readFile(path, 'utf8'),
    writeFile: (path, text) => saveSecretFile(path, text),
    unlink,
  }
}

describe('credentials read and write against the real platform', () => {
  let configDir = ''

  beforeAll(async () => {
    await deleteProbeItem()
    configDir = await mkdtemp(join(tmpdir(), 'zetrem-credentials-contract-'))
  })

  afterAll(async () => {
    await deleteProbeItem()
    if (configDir.length > 0) await rm(configDir, { recursive: true, force: true })
  })

  it('refuses to run security when an argument still carries the real service name', () => {
    const io = probeIo(join(configDir, 'guard'))
    expect(() => io.exec('security', ['find-generic-password', `-s=${KEYCHAIN_SERVICE}`])).toThrow(
      /refusing to run security/,
    )
  })

  it.skipIf(!isDarwin)(
    'maps the plain service argument to the probe name rather than refusing it',
    async () => {
      const io = probeIo(join(configDir, 'guard-maps'))
      const said = await Promise.resolve()
        .then(() => io.exec('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE]))
        .then(() => 'ran')
        .catch((cause: unknown) => String(cause))
      expect(said).not.toContain('refusing to run security')
    },
  )

  it('reads back nothing kept on a fresh config dir', async () => {
    const io = probeIo(join(configDir, 'empty'))
    expect(await readSnapshot(io)).toEqual({
      ok: true,
      value: { credentials: null, oauthAccount: null },
    })
  })

  it('writes a snapshot and reads it back byte-identical', async () => {
    const io = probeIo(join(configDir, 'roundtrip'))
    const snapshot = {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-one"}}',
      oauthAccount: { accountUuid: 'contract-uuid-1', emailAddress: 'contract1@example.com' },
    }
    await writeSnapshot(io, snapshot)
    expect(await readSnapshot(io)).toEqual({ ok: true, value: snapshot })
  })

  it('a second write replaces the first rather than erroring or keeping the old value', async () => {
    const io = probeIo(join(configDir, 'replace'))
    await writeSnapshot(io, {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-first"}}',
      oauthAccount: { accountUuid: 'contract-uuid-a' },
    })
    const second = {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-second"}}',
      oauthAccount: { accountUuid: 'contract-uuid-b' },
    }
    await writeSnapshot(io, second)
    expect(await readSnapshot(io)).toEqual({ ok: true, value: second })
  })

  it.skipIf(!isDarwin)(
    'on darwin leaves no .credentials.json behind: the tokens stay in the keychain alone',
    async () => {
      const dir = join(configDir, 'keychain-only')
      const io = probeIo(dir)
      await writeSnapshot(io, {
        credentials: '{"claudeAiOauth":{"accessToken":"fake-token-keychain"}}',
        oauthAccount: null,
      })
      await expect(stat(join(dir, '.credentials.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    },
  )

  it('a signed-out snapshot removes the item and the file, tolerating their absence, twice', async () => {
    const dir = join(configDir, 'sign-out')
    const io = probeIo(dir)
    await writeSnapshot(io, {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-before-signout"}}',
      oauthAccount: { accountUuid: 'contract-uuid-c' },
    })
    await writeSnapshot(io, { credentials: null, oauthAccount: null })
    expect(await readSnapshot(io)).toEqual({
      ok: true,
      value: { credentials: null, oauthAccount: null },
    })
    // Run it again: nothing left to remove, and it must still not error.
    await writeSnapshot(io, { credentials: null, oauthAccount: null })
    expect(await readSnapshot(io)).toEqual({
      ok: true,
      value: { credentials: null, oauthAccount: null },
    })
  })

  it('preserves every other key of an existing .claude.json and only replaces oauthAccount', async () => {
    const dir = join(configDir, 'preserve-keys')
    const io = probeIo(dir)
    await writeSnapshot(io, {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-preserve"}}',
      oauthAccount: { accountUuid: 'contract-uuid-old' },
    })
    const claudeJsonPath = join(dir, '.claude.json')
    const before = JSON.parse(await readFile(claudeJsonPath, 'utf8')) as Record<string, unknown>
    const withExtraKey = { ...before, theme: 'dark', numStartups: 7 }
    await writeFile(claudeJsonPath, JSON.stringify(withExtraKey, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    })

    await writeSnapshot(io, {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-preserve"}}',
      oauthAccount: { accountUuid: 'contract-uuid-new' },
    })

    const after = JSON.parse(await readFile(claudeJsonPath, 'utf8')) as Record<string, unknown>
    expect(after.theme).toBe('dark')
    expect(after.numStartups).toBe(7)
    expect(after.oauthAccount).toEqual({ accountUuid: 'contract-uuid-new' })
  })

  it('.claude.json is not world-readable', async () => {
    const dir = join(configDir, 'mode-claude-json')
    const io = probeIo(dir)
    await writeSnapshot(io, {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-mode"}}',
      oauthAccount: { accountUuid: 'contract-uuid-mode' },
    })
    const info = await stat(join(dir, '.claude.json'))
    expect(info.mode & 0o777).toBe(0o600)
  })

  it.skipIf(isDarwin)('elsewhere .credentials.json is not world-readable', async () => {
    const dir = join(configDir, 'mode-credentials-file')
    const io = probeIo(dir)
    await writeSnapshot(io, {
      credentials: '{"claudeAiOauth":{"accessToken":"fake-token-mode-file"}}',
      oauthAccount: null,
    })
    const info = await stat(join(dir, '.credentials.json'))
    expect(info.mode & 0o777).toBe(0o600)
  })
})
