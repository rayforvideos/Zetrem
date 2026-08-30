import { describe, expect, it } from 'vitest'
import type { AccountHere, AccountList } from '@/entities/auth'
import { emailOf, keptForMe } from './usage-owner'

const SIGNED_IN = { state: 'signed-in', email: 'file@un7qi3.co', orgName: null } as const

function list(here: AccountHere): AccountList {
  return {
    auth: SIGNED_IN,
    here,
    accounts: [
      { id: 'a1', email: 'ray@un7qi3.co', orgName: null, seenAt: 0 },
      { id: 'a2', email: '', orgName: null, seenAt: 0 },
    ],
  }
}

describe('emailOf: whose account this computer is holding', () => {
  it('names the row the credentials belong to, not the name the file is showing', () => {
    expect(emailOf(list({ kind: 'row', id: 'a1' }))).toBe('ray@un7qi3.co')
  })

  it('names the login outside Zetrem the file has caught up with', () => {
    expect(emailOf(list({ kind: 'named', email: 'out@un7qi3.co', orgName: null }))).toBe(
      'out@un7qi3.co',
    )
  })

  it('names nobody for a login neither a slot nor the file can name', () => {
    expect(emailOf(list({ kind: 'unnamed' }))).toBeNull()
    expect(emailOf(list({ kind: 'signed-out' }))).toBeNull()
    expect(emailOf(list({ kind: 'row', id: 'a2' }))).toBeNull()
    expect(emailOf(null)).toBeNull()
  })
})

describe('keptForMe: a kept reading is one account’s, not the app’s', () => {
  it('shows a reading taken for the account now signed in', () => {
    expect(keptForMe('5-hour 20%', 'ray@un7qi3.co', 'ray@un7qi3.co')).toBe('5-hour 20%')
  })

  it('reads the same address written in another case as the same account', () => {
    expect(keptForMe('5-hour 20%', 'Ray@Un7qi3.co', 'ray@un7qi3.co')).toBe('5-hour 20%')
  })

  it('refuses a reading belonging to another account, which is the whole bug', () => {
    expect(keptForMe('5-hour 20%', 'other@un7qi3.co', 'ray@un7qi3.co')).toBeNull()
  })

  it('refuses a reading from a file written before readings named an owner', () => {
    expect(keptForMe('5-hour 20%', null, 'ray@un7qi3.co')).toBeNull()
    expect(keptForMe('5-hour 20%', '', 'ray@un7qi3.co')).toBeNull()
  })

  it('refuses every reading while nobody is signed in', () => {
    expect(keptForMe('5-hour 20%', 'ray@un7qi3.co', null)).toBeNull()
  })

  it('has nothing to show when nothing was kept', () => {
    expect(keptForMe(null, 'ray@un7qi3.co', 'ray@un7qi3.co')).toBeNull()
  })
})
