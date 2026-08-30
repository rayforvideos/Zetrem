import { describe, expect, it } from 'vitest'
import { lost, won } from '@/shared/lib/outcome/outcome'
import { emptyIndex } from '../../../store/accounts-store/accounts-store'
import type {
  AccountsIndex,
  AccountsStore,
} from '../../../store/accounts-store/accounts-store.types'
import type { CredentialSnapshot } from '../../credentials/credentials.types'
import { accountHere, whoIsHere } from './who-is-here'
import type { HereDeps } from './who-is-here.types'

function tokens(name: string): string {
  return JSON.stringify({ claudeAiOauth: { accessToken: `token-${name}` } })
}

function label(name: string): unknown {
  return {
    accountUuid: `uuid-${name}`,
    emailAddress: `${name}@example.com`,
    organizationName: 'Org',
  }
}

function snap(name: string): CredentialSnapshot {
  return { credentials: tokens(name), oauthAccount: label(name) }
}

const OUT: CredentialSnapshot = { credentials: null, oauthAccount: null }

function store(): AccountsStore & { index: AccountsIndex; slots: Map<string, CredentialSnapshot> } {
  const slots = new Map<string, CredentialSnapshot>()
  const box = {
    index: emptyIndex(),
    slots,
    async load() {
      return structuredClone(box.index)
    },
    async save(index: AccountsIndex) {
      box.index = structuredClone(index)
    },
    async readSlot(id: string) {
      return slots.get(id) ?? null
    },
    async writeSlot(id: string, snapshot: CredentialSnapshot) {
      slots.set(id, snapshot)
    },
    async removeSlot(id: string) {
      slots.delete(id)
    },
  }
  return box
}

function row(id: string, name: string, seenAt = 0): AccountsIndex['accounts'][number] {
  return { id, email: `${name}@example.com`, orgName: 'Org', seenAt }
}

function deps(
  box: ReturnType<typeof store>,
  machine: CredentialSnapshot,
): HereDeps & { machine: { current: CredentialSnapshot } } {
  const held = { current: machine }
  return { store: box, read: async () => won(held.current), machine: held }
}

describe('whoIsHere: the credentials say who is here, never the name beside them', () => {
  it('names the row whose kept credentials the machine byte-matches', async () => {
    const box = store()
    box.index = { ...emptyIndex(), activeId: 'a1', accounts: [row('a1', 'a'), row('a2', 'b')] }
    box.slots.set('a1', snap('a'))
    box.slots.set('a2', snap('b'))
    // The machine holds B's tokens while the file still says A: the live
    // mismatch this whole model exists for.
    const here = await whoIsHere(
      deps(box, { credentials: tokens('b'), oauthAccount: label('a') }),
      box.index,
    )
    expect(here.ok && here.value.who).toEqual({ kind: 'row', id: 'a2' })
  })

  // A renewal of the active row and an outside login the label has not caught
  // up with are the same bytes under the same name. Claiming the row would
  // hand the next write another account's slot, so neither is claimed.
  it('claims no row for a token nobody kept, however the file names it', async () => {
    const box = store()
    box.index = { ...emptyIndex(), activeId: 'a1', accounts: [row('a1', 'a')] }
    box.slots.set('a1', snap('a'))
    const unmatched = { credentials: tokens('later'), oauthAccount: label('a') }
    const here = await whoIsHere(deps(box, unmatched), box.index)
    expect(here.ok && here.value.who).toEqual({ kind: 'unnamed' })
  })

  it('takes the file at its word for a login Zetrem never kept', async () => {
    const box = store()
    const here = await whoIsHere(deps(box, snap('outside')), box.index)
    expect(here.ok && here.value.who).toEqual({
      kind: 'named',
      email: 'outside@example.com',
      orgName: 'Org',
    })
  })

  it('is unnamed when no slot matches and the file still names somebody else', async () => {
    const box = store()
    box.index = { ...emptyIndex(), activeId: 'a1', accounts: [row('a1', 'a')] }
    box.slots.set('a1', snap('a'))
    // The state the machine is really in: an outside login wrote new tokens
    // and the label has not caught up, so it names neither of the two.
    const here = await whoIsHere(
      deps(box, { credentials: tokens('outside'), oauthAccount: null }),
      box.index,
    )
    expect(here.ok && here.value.who).toEqual({ kind: 'unnamed' })
  })

  it('is signed out when there are no credentials at all', async () => {
    const box = store()
    const here = await whoIsHere(deps(box, OUT), box.index)
    expect(here.ok && here.value.who).toEqual({ kind: 'signed-out' })
  })

  it('refuses rather than call an unreadable keychain an empty one', async () => {
    const box = store()
    const here = await whoIsHere(
      { store: box, read: async () => lost('failed', 'User interaction is not allowed.') },
      box.index,
    )
    expect(here).toEqual({ ok: false, why: { code: 'failed', said: 'credentials-unreadable' } })
  })

  it('hands back the credentials it read, so nobody reads them twice', async () => {
    const box = store()
    const here = await whoIsHere(deps(box, snap('one')), box.index)
    expect(here.ok && here.value.held).toEqual(snap('one'))
  })
})

describe('accountHere: the identity a usage reading belongs to', () => {
  it('is the row the credentials match, not the name the file is showing', async () => {
    const box = store()
    box.index = { ...emptyIndex(), activeId: 'a1', accounts: [row('a1', 'a'), row('a2', 'b')] }
    box.slots.set('a1', snap('a'))
    box.slots.set('a2', snap('b'))
    const who = await accountHere(deps(box, { credentials: tokens('b'), oauthAccount: label('a') }))
    expect(who).toBe('b@example.com')
  })

  it('is nobody when the machine holds a login no slot and no label can name', async () => {
    const box = store()
    box.index = { ...emptyIndex(), activeId: 'a1', accounts: [row('a1', 'a')] }
    box.slots.set('a1', snap('a'))
    const who = await accountHere(deps(box, { credentials: tokens('outside'), oauthAccount: null }))
    expect(who).toBeNull()
  })

  // The reading was taken under a token that is not the row's kept one. It may
  // be that row renewed, or the account that replaced it; a usage bar named on
  // a guess shows one account's limits under another's name.
  it('is nobody when the label names a kept account the bytes are not', async () => {
    const box = store()
    box.index = { ...emptyIndex(), activeId: 'a1', accounts: [row('a1', 'a')] }
    box.slots.set('a1', snap('a'))
    const machine = { credentials: tokens('later'), oauthAccount: label('a') }
    expect(await accountHere(deps(box, machine))).toBeNull()
  })

  it('is nobody for a row filed before its name arrived', async () => {
    const box = store()
    box.index = {
      ...emptyIndex(),
      activeId: 'a1',
      accounts: [{ id: 'a1', email: '', orgName: null, seenAt: 0 }],
    }
    box.slots.set('a1', snap('a'))
    expect(await accountHere(deps(box, snap('a')))).toBeNull()
  })

  // The label is a hint a running claude can rewrite from its own memory, not
  // a fact about whose token the usage numbers came from: a usage bar stamped
  // with it would assert a name for numbers it cannot attribute.
  it('is nobody for a login outside Zetrem even once the label names it', async () => {
    const box = store()
    expect(await accountHere(deps(box, snap('outside')))).toBeNull()
  })
})
