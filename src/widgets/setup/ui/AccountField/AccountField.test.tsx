import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountField } from './AccountField'

const account = {
  auth: { state: 'cli-missing' as const },
  error: null,
  note: '',
  signingIn: false,
  signingOut: false,
  sessionLive: false,
  installing: false,
  onSignIn: () => {},
  onSignOut: () => {},
  onInstall: () => {},
  onRecheck: () => {},
}

describe('AccountField when claude is not found', () => {
  it('needs the i18n provider the app mounts at its root: without one it throws', () => {
    // This is the Windows beta.8 crash: the shim is not a binary, this branch
    // renders <Trans>, and no provider was there to answer it.
    expect(() => renderToStaticMarkup(<AccountField account={account} />)).toThrow(/I18nProvider/)
    i18n.load('en', {})
    i18n.activate('en')
    const out = renderToStaticMarkup(
      <I18nProvider i18n={i18n}>
        <AccountField account={account} />
      </I18nProvider>,
    )
    expect(out).toContain('Install Claude Code')
  })
})
