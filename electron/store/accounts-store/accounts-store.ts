import { mkdir, readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { CredentialSnapshot } from '../../cli/credentials/credentials.types'
import { saveFile, saveSecretFile } from '../save-file/save-file'
import type { AccountsIndex, AccountsStore, Cipher, KeptAccount } from './accounts-store.types'

// The slot a bygone version filed the machine's untouched login into. The
// concept is gone; the file is deleted on the next load so it stops sitting in
// the store as a login nothing points at.
const BYGONE_SYSTEM_DEFAULT = 'system-default'

const SLOT_ID = /^[A-Za-z0-9-]+$/

export function emptyIndex(): AccountsIndex {
  return { version: 1, activeId: null, accounts: [] }
}

function rowOf(value: unknown): KeptAccount | null {
  if (value === null || typeof value !== 'object') return null
  const { id, email, orgName, accountUuid, notNamed, seenAt } = value as Record<string, unknown>
  if (typeof id !== 'string' || !SLOT_ID.test(id)) return null
  if (typeof email !== 'string') return null
  return {
    id,
    email,
    orgName: typeof orgName === 'string' ? orgName : null,
    ...(typeof notNamed === 'string' ? { notNamed } : {}),
    // A row filed before the file named its login has none, so a missing one is
    // kept as missing rather than dropping the row it belongs to.
    ...(typeof accountUuid === 'string' ? { accountUuid } : {}),
    seenAt: typeof seenAt === 'number' ? seenAt : 0,
  }
}

function indexOf(text: string): AccountsIndex {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text) as Record<string, unknown>
  } catch {
    return emptyIndex()
  }
  const rows = Array.isArray(parsed.accounts) ? parsed.accounts : []
  const accounts = rows.map(rowOf).filter((row): row is KeptAccount => row !== null)
  const activeId = typeof parsed.activeId === 'string' ? parsed.activeId : null
  // An old index may still carry systemDefaultKept; it is read past and dropped.
  return {
    version: 1,
    activeId: accounts.some((row) => row.id === activeId) ? activeId : null,
    accounts,
  }
}

function snapshotOf(text: string): CredentialSnapshot | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const credentials = typeof parsed.credentials === 'string' ? parsed.credentials : null
    return { credentials, oauthAccount: parsed.oauthAccount ?? null }
  } catch {
    return null
  }
}

export function openAccountsStore(dir: string, cipher: Cipher): AccountsStore {
  const indexPath = join(dir, 'accounts.json')
  const slotPath = (id: string): string => {
    // The id names a file, so only plain tokens may reach the path.
    if (!SLOT_ID.test(id)) throw new Error(`refused slot id ${JSON.stringify(id)}`)
    return join(dir, `${id}.bin`)
  }
  return {
    async load() {
      // A one-time sweep of the bygone system-default slot, so it stops living
      // in the store as a login nothing points at.
      await unlink(join(dir, `${BYGONE_SYSTEM_DEFAULT}.bin`)).catch(() => undefined)
      try {
        return indexOf(await readFile(indexPath, 'utf8'))
      } catch {
        return emptyIndex()
      }
    },
    async save(index) {
      await mkdir(dir, { recursive: true })
      await saveFile(indexPath, JSON.stringify(index, null, 2))
    },
    async readSlot(id) {
      try {
        return snapshotOf(cipher.decrypt(await readFile(slotPath(id))))
      } catch {
        return null
      }
    },
    async writeSlot(id, snapshot) {
      const path = slotPath(id)
      await mkdir(dir, { recursive: true })
      await saveSecretFile(path, cipher.encrypt(JSON.stringify(snapshot)))
    },
    async removeSlot(id) {
      await unlink(slotPath(id)).catch(() => undefined)
    },
  }
}
