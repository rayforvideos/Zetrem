import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { readSnapshot, writeSnapshot, KEYCHAIN_SERVICE } from './credentials'
import type { CredentialIo, CredentialSnapshot } from './credentials.types'

const HOME = '/home/me'
const DIR = join(HOME, '.claude')
const LABEL = join(HOME, '.claude.json')
const TOKENS = join(DIR, '.credentials.json')
const STRAY = join(DIR, '.claude.json')

type Call = { command: string; args: string[]; stdin: string | undefined }

function fakeIo(
  platform: string,
  files: Record<string, string>,
  keychain: { value: string | null; refuses?: boolean; unreadable?: string },
): CredentialIo & { calls: Call[]; files: Record<string, string> } {
  const calls: Call[] = []
  return {
    platform,
    user: 'me',
    configDir: DIR,
    labelPath: LABEL,
    files,
    calls,
    async exec(command, args, stdin) {
      calls.push({ command, args, stdin })
      if (command !== 'security') throw new Error(`unexpected ${command}`)
      const verb = args[0]
      if (verb === 'find-generic-password') {
        // security exits 44 for an item that is not there, and something else
        // for a read it could not make: a denied prompt, a locked keychain.
        if (keychain.unreadable !== undefined)
          throw Object.assign(new Error(keychain.unreadable), { code: 36 })
        if (keychain.value === null)
          throw Object.assign(new Error('The specified item could not be found'), { code: 44 })
        return `${keychain.value}\n`
      }
      if (verb === 'add-generic-password') {
        if (keychain.refuses === true)
          throw new Error('The user name or passphrase you entered is not correct')
        const given = args[args.indexOf('-w') + 1]
        if (given !== undefined) {
          keychain.value = given
          return ''
        }
        // security asks twice and answers 0 even when the two did not match.
        const [first, second] = (stdin ?? '').split('\n')
        if (first !== undefined && first === second) keychain.value = first
        return ''
      }
      if (verb === 'delete-generic-password') {
        if (keychain.value === null) throw new Error('not found')
        keychain.value = null
        return ''
      }
      throw new Error(`unexpected ${verb}`)
    },
    async readFile(path) {
      if (!(path in files)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      const content = files[path]
      if (content === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return content
    },
    async writeFile(path, text) {
      files[path] = text
    },
    async unlink(path) {
      if (!(path in files)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      delete files[path]
    },
  }
}

const CREDS = '{"claudeAiOauth":{"accessToken":"a"}}'
const CLAUDE_JSON = JSON.stringify({ theme: 'dark', oauthAccount: { accountUuid: 'u1' } })

// Helper to extract defined string from indexable access (noUncheckedIndexedAccess)
const getOrThrow = (val: string | undefined): string => {
  if (val === undefined) throw new Error('Expected file to exist')
  return val
}

function held(read: Outcome<CredentialSnapshot>): CredentialSnapshot {
  if (!read.ok) throw new Error(`expected a snapshot, got ${read.why.said}`)
  return read.value
}

describe('readSnapshot', () => {
  it('on macOS prefers the keychain item and reads oauthAccount from .claude.json', async () => {
    const io = fakeIo('darwin', { [LABEL]: CLAUDE_JSON }, { value: CREDS })
    expect(await readSnapshot(io)).toEqual({
      ok: true,
      value: { credentials: CREDS, oauthAccount: { accountUuid: 'u1' } },
    })
    expect(io.calls[0]).toEqual({
      command: 'security',
      args: ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', 'me', '-w'],
    })
  })
  it('on macOS falls back to .credentials.json when the keychain has nothing', async () => {
    const io = fakeIo('darwin', { [TOKENS]: CREDS }, { value: null })
    expect(held(await readSnapshot(io)).credentials).toBe(CREDS)
  })
  it('elsewhere reads only the file and never calls security', async () => {
    const io = fakeIo('win32', { [TOKENS]: CREDS }, { value: 'x' })
    expect(held(await readSnapshot(io)).credentials).toBe(CREDS)
    expect(io.calls).toEqual([])
  })
  it('reads the name from the home root, ignoring one left inside the config dir', async () => {
    const io = fakeIo(
      'darwin',
      {
        [LABEL]: CLAUDE_JSON,
        [STRAY]: JSON.stringify({ oauthAccount: { accountUuid: 'stray' } }),
      },
      { value: CREDS },
    )
    expect(held(await readSnapshot(io)).oauthAccount).toEqual({ accountUuid: 'u1' })
  })
  it('is signed out when neither exists', async () => {
    const io = fakeIo('darwin', {}, { value: null })
    expect(await readSnapshot(io)).toEqual({
      ok: true,
      value: { credentials: null, oauthAccount: null },
    })
  })
  it('refuses rather than answer with the file when the keychain could not be read', async () => {
    // The item is there and holds another account; the stale file beside it is
    // one claude left behind. Answering with the file is answering wrongly.
    const io = fakeIo(
      'darwin',
      { [TOKENS]: '{"claudeAiOauth":{"accessToken":"stale"}}' },
      { value: CREDS, unreadable: 'User interaction is not allowed.' },
    )
    const read = await readSnapshot(io)
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.why.said).toContain('User interaction is not allowed.')
  })
})

describe('writeSnapshot', () => {
  it('on macOS writes the keychain item and oauthAccount, and no token file', async () => {
    const keychain = { value: 'old' }
    const io = fakeIo(
      'darwin',
      {
        [LABEL]: CLAUDE_JSON,
        [TOKENS]: 'stale',
      },
      keychain,
    )
    await writeSnapshot(io, { credentials: CREDS, oauthAccount: { accountUuid: 'u2' } })
    expect(keychain.value).toBe(CREDS)
    // A file beside the item is a plainer second copy, and an old one is read first.
    expect(TOKENS in io.files).toBe(false)
    expect(JSON.parse(getOrThrow(io.files[LABEL]))).toEqual({
      theme: 'dark',
      oauthAccount: { accountUuid: 'u2' },
    })
  })
  it('hands the secret to security on stdin, never in the arguments', async () => {
    const io = fakeIo('darwin', {}, { value: null })
    await writeSnapshot(io, { credentials: CREDS, oauthAccount: null })
    const asked = io.calls.filter((one) => one.args[0] === 'add-generic-password')
    expect(asked.map((one) => one.args)).toEqual([
      ['add-generic-password', '-U', '-s', KEYCHAIN_SERVICE, '-a', 'me', '-w'],
    ])
    expect(asked[0]?.stdin).toBe(`${CREDS}\n${CREDS}\n`)
    expect(io.calls.some((one) => one.args.includes(CREDS))).toBe(false)
  })
  it('passes a secret with a newline as an argument, since the prompt reads one line', async () => {
    const many = '{\n  "claudeAiOauth": {}\n}'
    const keychain = { value: null as string | null }
    const io = fakeIo('darwin', {}, keychain)
    await writeSnapshot(io, { credentials: many, oauthAccount: null })
    expect(keychain.value).toBe(many)
    expect(io.calls.some((one) => one.args.includes(many))).toBe(true)
  })
  it('falls back to the file when the keychain refuses, and forgets the old item', async () => {
    const keychain = { value: 'old', refuses: true }
    const io = fakeIo('darwin', {}, keychain)
    await writeSnapshot(io, { credentials: CREDS, oauthAccount: null })
    expect(keychain.value).toBeNull()
    expect(io.files[TOKENS]).toBe(CREDS)
  })
  it('elsewhere writes only the files', async () => {
    const io = fakeIo('linux', {}, { value: null })
    await writeSnapshot(io, { credentials: CREDS, oauthAccount: { accountUuid: 'u2' } })
    expect(io.calls).toEqual([])
    expect(io.files[TOKENS]).toBe(CREDS)
    expect(JSON.parse(getOrThrow(io.files[LABEL]))).toEqual({
      oauthAccount: { accountUuid: 'u2' },
    })
  })
  it('writes the name where the CLI keeps it, not beside the credentials file', async () => {
    // Claude Code reads ~/.claude.json in the home root; a name left inside
    // ~/.claude is one it never sees, and `claude auth status` keeps echoing
    // whoever was signed in before.
    const io = fakeIo('linux', {}, { value: null })
    await writeSnapshot(io, { credentials: CREDS, oauthAccount: { accountUuid: 'u2' } })
    expect(STRAY in io.files).toBe(false)
    expect(LABEL in io.files).toBe(true)
  })
  it('a signed-out snapshot removes the item, the file and the key, tolerating absence', async () => {
    const keychain = { value: null as string | null }
    const io = fakeIo('darwin', { [LABEL]: CLAUDE_JSON }, keychain)
    await writeSnapshot(io, { credentials: null, oauthAccount: null })
    expect(keychain.value).toBeNull()
    expect(TOKENS in io.files).toBe(false)
    expect(JSON.parse(getOrThrow(io.files[LABEL]))).toEqual({
      theme: 'dark',
    })
  })
})
