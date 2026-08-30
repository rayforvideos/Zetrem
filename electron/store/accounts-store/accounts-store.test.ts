import { chmod, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyIndex, openAccountsStore } from './accounts-store'
import type { AccountsStore, Cipher } from './accounts-store.types'

// Reversible and visibly not plaintext, so a test can tell the slot was ciphered.
const rot: Cipher = {
  encrypt: (text) => Buffer.from(text, 'utf8').reverse(),
  decrypt: (data) => Buffer.from(data).reverse().toString('utf8'),
}

let dir: string
let store: AccountsStore

beforeEach(async () => {
  dir = join(await mkdtemp(join(tmpdir(), 'zt-accounts-')), 'accounts')
  store = openAccountsStore(dir, rot)
})
afterEach(() => rm(join(dir, '..'), { recursive: true, force: true }))

describe('the index', () => {
  it('is empty before anything is saved', async () => {
    expect(await store.load()).toEqual(emptyIndex())
  })
  it('round-trips and creates its directory', async () => {
    const index = {
      version: 1 as const,
      activeId: 'a1',
      accounts: [{ id: 'a1', email: 'a@b.c', orgName: null, accountUuid: 'u1', seenAt: 5 }],
    }
    await store.save(index)
    expect(await store.load()).toEqual(index)
  })
  it('drops rows it cannot read rather than the whole file', async () => {
    await store.save({
      version: 1,
      activeId: 'a1',
      accounts: [
        { id: 'a1', email: 'a@b.c', orgName: 'O', accountUuid: 'u1', seenAt: 1 },
        { id: 7, email: 'x' } as never,
      ],
    })
    const loaded = await store.load()
    expect(loaded.accounts.map((a) => a.id)).toEqual(['a1'])
  })
  it('forgets an activeId that names no row', async () => {
    await store.save({ version: 1, activeId: 'gone', accounts: [] })
    expect((await store.load()).activeId).toBeNull()
  })
  it('reads past a bygone systemDefaultKept and sweeps its slot on load', async () => {
    await store.writeSlot('system-default', { credentials: 'old', oauthAccount: null })
    await writeFile(
      join(dir, 'accounts.json'),
      JSON.stringify({ version: 1, activeId: null, systemDefaultKept: true, accounts: [] }),
    )
    const loaded = await store.load()
    expect(loaded).toEqual(emptyIndex())
    expect('systemDefaultKept' in loaded).toBe(false)
    expect(await store.readSlot('system-default')).toBeNull()
  })
})

describe('slots', () => {
  const snapshot = { credentials: '{"claudeAiOauth":{}}', oauthAccount: { accountUuid: 'u1' } }
  it('round-trip through the cipher and are not stored as plaintext', async () => {
    await store.writeSlot('a1', snapshot)
    const raw = await readFile(join(dir, 'a1.bin'))
    expect(raw.toString('utf8')).not.toContain('claudeAiOauth')
    expect(await store.readSlot('a1')).toEqual(snapshot)
  })
  it('keep a signed-out snapshot', async () => {
    await store.writeSlot('a1', { credentials: null, oauthAccount: null })
    expect(await store.readSlot('a1')).toEqual({
      credentials: null,
      oauthAccount: null,
    })
  })
  it('are null when missing and removable when present', async () => {
    expect(await store.readSlot('nope')).toBeNull()
    await store.writeSlot('a1', snapshot)
    await store.removeSlot('a1')
    await store.removeSlot('a1')
    expect(await store.readSlot('a1')).toBeNull()
  })
  it('replace the file rather than write over it, and stay unreadable to others', async () => {
    await store.writeSlot('a1', snapshot)
    const path = join(dir, 'a1.bin')
    if (process.platform !== 'win32') {
      expect((await stat(path)).mode & 0o777).toBe(0o600)
      // A read-only file can still be replaced; only writing into it fails.
      await chmod(path, 0o400)
    }
    await store.writeSlot('a1', { credentials: 'second', oauthAccount: null })
    expect(await store.readSlot('a1')).toEqual({ credentials: 'second', oauthAccount: null })
    expect(await readdir(dir)).toEqual(['a1.bin'])
  })
  it('refuse an id that is not a plain token', async () => {
    await expect(store.writeSlot('../evil', snapshot)).rejects.toThrow(/slot id/)
  })
})
