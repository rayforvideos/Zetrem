import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import type { AccountList } from '@/entities/auth'
import type { Account } from '../SetupPane/SetupPane.types'
import { AccountField } from './AccountField'

const base: Account = {
  auth: { state: 'cli-missing' },
  accounts: null,
  busy: null,
  busyOn: null,
  error: null,
  note: '',
  sessionLive: false,
  installing: false,
  onAdd: () => {},
  onSwitch: () => {},
  onReauth: () => {},
  onRemove: () => {},
  onSignOut: () => {},
  onInstall: () => {},
  onRecheck: () => {},
  onCancelLogin: () => {},
}

function rowOf(out: string, id: string): string {
  const rows = out.split('data-account-row="').slice(1)
  const row = rows.find((one) => one.startsWith(`${id}"`))
  if (row === undefined) throw new Error(`no row ${id}`)
  return row
}

function render(account: Account): string {
  return renderToStaticMarkup(
    <I18nProvider i18n={i18n}>
      <AccountField account={account} />
    </I18nProvider>,
  )
}

beforeAll(() => {
  i18n.load('en', {})
  i18n.activate('en')
})

describe('AccountField when claude is not found', () => {
  it('needs the i18n provider the app mounts at its root: without one it throws', () => {
    expect(() => renderToStaticMarkup(<AccountField account={base} />)).toThrow(/I18nProvider/)
    expect(render(base)).toContain('Install Claude Code')
  })
})

describe('AccountField with accounts', () => {
  const signedIn = { state: 'signed-in' as const, email: 'ray@example.com', orgName: 'Org' }
  const accounts: AccountList = {
    auth: signedIn,
    here: { kind: 'row', id: 'a2' },
    accounts: [
      { id: 'a1', email: 'one@example.com', orgName: 'One Org', seenAt: 0 },
      { id: 'a2', email: 'ray@example.com', orgName: 'Org', seenAt: 0 },
    ],
  }
  it('lists every added account and marks the one that is here', () => {
    const out = render({ ...base, auth: signedIn, accounts })
    // No anonymous default row: only the accounts the person added.
    expect(out).not.toContain('System default')
    expect(out).toContain('one@example.com')
    expect(out).toContain('ray@example.com')
    expect(out.match(/aria-pressed="true"/g)?.length).toBe(1)
    expect(rowOf(out, 'a2')).toContain('Active')
    expect(out).toContain('Add account')
    expect(out).toContain('Re-authenticate')
    expect(out).toContain('Remove')
    // The machine-wide sign out lives on its own, not on a row.
    expect(out).toContain('Sign out of Claude Code')
  })
  it('offers to sign in when nothing is signed in and no account is kept', () => {
    const out = render({
      ...base,
      auth: { state: 'signed-out' },
      accounts: { auth: { state: 'signed-out' }, here: { kind: 'signed-out' }, accounts: [] },
    })
    expect(out).toContain('Sign in with Anthropic')
    expect(out).not.toContain('Re-authenticate')
  })
  it('offers a way out of a browser login that is not coming back', () => {
    const adding = render({ ...base, auth: signedIn, accounts, busy: 'add', busyOn: null })
    expect(adding).toContain('data-account-cancel-login')
    expect(adding).toContain('Cancel sign-in')

    // A re-auth waits on the same browser page, so it gets the same way out.
    const reauthing = render({
      ...base,
      auth: signedIn,
      accounts,
      busy: 'reauth',
      busyOn: { id: 'a2' },
    })
    expect(reauthing).toContain('data-account-cancel-login')
  })
  it('offers no way out when nothing is waiting on a browser', () => {
    expect(render({ ...base, auth: signedIn, accounts })).not.toContain('data-account-cancel-login')
    // A switch touches no browser: there is nothing there to cancel.
    const switching = render({
      ...base,
      auth: signedIn,
      accounts,
      busy: 'switch',
      busyOn: { id: 'a1' },
    })
    expect(switching).not.toContain('data-account-cancel-login')
  })
  it('shows the error where the hint would be', () => {
    const out = render({ ...base, auth: signedIn, accounts, error: 'Could not switch accounts.' })
    expect(out).toContain('Could not switch accounts.')
  })
  it('marks no row and reports an outside login on a line of its own', () => {
    const out = render({
      ...base,
      auth: signedIn,
      accounts: {
        ...accounts,
        here: { kind: 'named', email: 'outside@example.com', orgName: 'Other Org' },
      },
    })
    // Nothing byte-matched, so no row wears the Active badge.
    expect(out.match(/aria-pressed="true"/g) ?? []).toHaveLength(0)
    expect(rowOf(out, 'a2')).not.toContain('Active')
    // Attributed to the label, not asserted as fact: `.claude.json` can lag or
    // be rewritten by a running claude, and this reading did not byte-match.
    expect(out).toContain('Claude Code reports')
    expect(out).toContain('outside@example.com')
    // Never asserted as a row's own byte-matched identity.
    expect(rowOf(out, 'a2')).not.toContain('outside@example.com')
  })
  it('says so plainly when a login outside Zetrem has no name yet', () => {
    const out = render({
      ...base,
      auth: signedIn,
      accounts: { ...accounts, here: { kind: 'unnamed' } },
    })
    expect(out.match(/aria-pressed="true"/g) ?? []).toHaveLength(0)
    expect(out).toContain('outside Zetrem')
  })
  it('names a row that was filed before the file caught up, without pretending', () => {
    const out = render({
      ...base,
      auth: signedIn,
      accounts: {
        ...accounts,
        here: { kind: 'row', id: 'a3' },
        accounts: [...accounts.accounts, { id: 'a3', email: '', orgName: null, seenAt: 0 }],
      },
    })
    expect(rowOf(out, 'a3')).toContain('not known yet')
    expect(rowOf(out, 'a3')).toContain('Active')
  })
  it('disables every button while an operation runs, so none silently does nothing', () => {
    const out = render({ ...base, auth: signedIn, accounts, busy: 'switch' })
    // The class names carry disabled: variants, so only the attribute counts.
    const buttons = out.match(/<button[^>]*>/g) ?? []
    expect(buttons.length).toBeGreaterThan(1)
    expect(buttons.filter((one) => !one.includes('disabled=""')).length).toBe(0)
  })
  it('spins on the row being switched to, not on the row that is still active', () => {
    const out = render({
      ...base,
      auth: signedIn,
      accounts,
      busy: 'switch',
      busyOn: { id: 'a1' },
    })
    expect(rowOf(out, 'a1')).toContain('aria-label="Loading"')
    expect(rowOf(out, 'a1')).not.toContain('Re-authenticate')
    expect(rowOf(out, 'a2')).not.toContain('aria-label="Loading"')
    expect(rowOf(out, 'a2')).toContain('Re-authenticate')
    expect(rowOf(out, 'a2')).toContain('Remove')
  })
  it('spins the standalone sign-out button while signing out', () => {
    const out = render({
      ...base,
      auth: signedIn,
      accounts,
      busy: 'signout',
      busyOn: { id: null },
    })
    const signout = out.split('data-account-signout')[1] ?? ''
    expect(signout).toContain('Sign out of Claude Code')
    expect(signout).toContain('aria-label="Loading"')
    // No row is the target of a machine-wide sign out, so none of them spins.
    expect(rowOf(out, 'a1')).not.toContain('aria-label="Loading"')
  })
  it('leaves the rows alone while an account is being added', () => {
    const out = render({ ...base, auth: signedIn, accounts, busy: 'add', busyOn: null })
    expect(rowOf(out, 'a2')).not.toContain('aria-label="Loading"')
    expect(out).toContain('aria-label="Loading"')
  })
})
