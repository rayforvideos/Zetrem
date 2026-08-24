import { renderToStaticMarkup } from 'react-dom/server'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { describe, expect, it } from 'vitest'
import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import type { AuthStatus } from '@/entities/auth'
import type { Failure } from '@/shared/lib/failure/failure.types'
import { SetupPane } from './SetupPane'

type Flat = {
  auth: AuthStatus | null
  project: { name: string; path: string } | null
  permissionMode: PermissionMode
  model: ModelChoice
  notify: boolean
  reopened: boolean
  canStart: boolean
  sessionLive: boolean
  authError: string | null
  loginNote: string
  notice: Failure | null
  installing: boolean
  recent: { path: string; name: string }[]
}

function pane(over: Partial<Flat> = {}): string {
  const flat: Flat = {
    auth: null,
    project: null,
    permissionMode: 'ask',
    model: 'default',
    notify: true,
    reopened: false,
    canStart: false,
    sessionLive: false,
    authError: null,
    loginNote: '',
    notice: null,
    installing: false,
    recent: [],
    ...over,
  }
  return renderToStaticMarkup(
    <I18nProvider i18n={i18n}>
      <SetupPane
        account={{
          auth: flat.auth,
          error: flat.authError,
          note: flat.loginNote,
          signingIn: false,
          signingOut: false,
          sessionLive: flat.sessionLive,
          installing: flat.installing,
          onSignIn: () => {},
          onSignOut: () => {},
          onInstall: () => {},
        }}
        you={{ name: 'Ray', face: 'onigiri', onName: () => {}, onFace: () => {} }}
        project={{
          chosen: flat.project,
          recent: flat.recent,
          onChoose: () => {},
          onPickRecent: () => {},
        }}
        defaults={{
          permissionMode: flat.permissionMode,
          model: flat.model,
          tongue: 'system' as const,
          onTongue: () => {},
          notify: flat.notify,
          onNotify: () => {},
          enterSends: true,
          onEnterSends: () => {},
          onPermissionMode: () => {},
          onModel: () => {},
        }}
        plugins={{ summary: 'none', onOpen: () => {} }}
        agents={{ stock: ['Explore', 'Plan'], on: ['Explore'], onChange: () => {} }}
        actions={{
          reopened: flat.reopened,
          signedIn: flat.auth?.state === 'signed-in',
          hasProject: flat.project != null,
          onStart: () => {},
          onCancel: () => {},
        }}
        notice={flat.notice}
      />
    </I18nProvider>,
  )
}

describe('the settings split into tabs on the left', () => {
  it('offers the four sections by name', () => {
    const html = pane()
    for (const label of ['Start', 'General', 'Session', 'Extensions']) {
      expect(html, `${label} is missing from the rail`).toContain(`>${label}<`)
    }
  })

  it('opens on Start, where signing in and picking a folder live', () => {
    const html = pane()
    const rail = html.slice(html.indexOf('aria-label="Settings sections"'))
    expect(rail.slice(0, rail.indexOf('>Start<'))).toContain('aria-current="true"')
  })

  it('keeps the other sections mounted but hidden, so a typed name survives a tab switch', () => {
    const html = pane()
    expect(html.match(/<section[^>]* hidden=""/g)).toHaveLength(3)
    expect(html).toContain('Notifications')
  })

  it('anchors the frame to the top, so a tab switch moves nothing above the fold', () => {
    const html = pane()
    expect(html, 'vertical centring would jump with each tab height').not.toContain('mt-auto')
    expect(html, 'the content column holds its floor').toContain('min-h-[420px]')
  })
})

describe('SetupPane: everything to settle before starting, on one screen', () => {
  it('shows everything there is to settle', () => {
    const html = pane()
    for (const label of ['Account', 'Project', 'Permissions', 'Model', 'Plugins']) {
      expect(html, `${label} is missing`).toContain(label)
    }
  })

  it('locks Start without an account and a project, and says why', () => {
    const html = pane()
    expect(html).toContain('Sign in and choose a project folder')
    const start = html.slice(html.lastIndexOf('<button', html.indexOf('>Start<')))
    expect(start).toContain('disabled=""')
  })

  it('opens Start once both are set, so the test above cannot pass by accident', () => {
    const html = pane({
      auth: { state: 'signed-in', email: 'sam@example.com', orgName: null },
      project: { name: 'zetrem', path: '/tmp/zetrem' },
    })
    const start = html.slice(html.lastIndexOf('<button', html.indexOf('>Start<')))
    expect(start).not.toContain('disabled=""')
    expect(html).not.toContain('Sign in')
  })

  it('offers a way out while signed in, because no way to switch accounts is a trap', () => {
    const html = pane({
      auth: { state: 'signed-in', email: 'sam@example.com', orgName: null },
    })
    expect(html).toContain('sam@example.com')
    expect(html).toContain('Sign out')
  })

  it('warns that signing out cuts a running session', () => {
    const live = pane({
      auth: { state: 'signed-in', email: 'sam@example.com', orgName: null },
      sessionLive: true,
    })
    expect(live).toContain('stops the running session')
    const idle = pane({ auth: { state: 'signed-in', email: 'sam@example.com', orgName: null } })
    expect(idle).not.toContain('stops the running session')
  })

  it('leaves a failed sign-out on screen rather than quietly pretending', () => {
    const html = pane({
      auth: { state: 'signed-in', email: 'sam@example.com', orgName: null },
      authError: 'claude: command not found',
    })
    expect(html).toContain('claude: command not found')
    expect(html).not.toContain('Sign out to use a different')
  })

  it('writes both what failed and why', () => {
    const html = pane({
      notice: { what: 'Could not save your settings', why: 'EROFS: read-only file system' },
    })
    expect(html).toContain('Could not save your settings')
    expect(html).toContain('EROFS: read-only file system')
  })

  it('takes the warning space away when there is nothing wrong', () => {
    expect(pane()).not.toContain('data-notice')
  })

  it('offers no Cancel the first time, since there is nothing to go back to', () => {
    const html = pane()
    expect(html).toContain('>Start<')
    expect(html).not.toContain('>Cancel<')
  })

  it('offers Cancel on a reopen, where there is a state to go back to', () => {
    const html = pane({ reopened: true, canStart: true })
    const acts = html.slice(html.indexOf('data-actions'))
    expect(acts).toContain('>Cancel<')
    expect(acts).toContain('>Done<')
    expect(acts, 'the Start tab stays, the Start button becomes Done').not.toContain('>Start<')
  })

  it('puts the main action last, where a desktop expects it', () => {
    const html = pane({ reopened: true, canStart: true })
    expect(html.indexOf('>Cancel<')).toBeLessThan(html.indexOf('>Done<'))
  })

  it('says the CLI is missing instead of offering sign-in', () => {
    const html = pane({ auth: { state: 'cli-missing' } })
    expect(html).toContain('command was not found')
  })

  it('offers to install the missing CLI, since a fresh machine has no other way in', () => {
    const html = pane({ auth: { state: 'cli-missing' } })
    expect(html).toContain('Install Claude Code')
    expect(html).not.toContain('Sign in with Anthropic')
  })

  it('shows the install running, so a five-minute download does not look dead', () => {
    const html = pane({ auth: { state: 'cli-missing' }, installing: true })
    expect(html).toContain('Installing Claude Code')
  })

  it('leaves a failed install on screen', () => {
    const html = pane({ auth: { state: 'cli-missing' }, authError: 'curl: (6) could not resolve' })
    expect(html).toContain('curl: (6) could not resolve')
  })

  it('holds the built-in agent toggles, which moved here from the sidebar', () => {
    const html = pane()
    expect(html).toContain('Agents')
    expect(html).toContain('Explore')
    expect(html).toContain('Plan')
  })

  it('offers the folders someone worked in lately', () => {
    const html = pane({
      project: { name: 'zetrem', path: '/tmp/zetrem' },
      recent: [{ path: '/tmp/alpha', name: 'alpha' }],
    })
    expect(html).toContain('alpha')
    expect(html).toContain('/tmp/alpha')
  })

  it('keeps the field quiet when there is nowhere to go back to', () => {
    const html = pane({ project: { name: 'zetrem', path: '/tmp/zetrem' } })
    expect(html).not.toContain('data-recent')
  })

  it('sizes the choice pills to their content, and not to the field around them', () => {
    const html = pane()
    const groups = [...html.matchAll(/<div[^>]*data-slot="toggle-group"[^>]*class="([^"]*)"/g)].map(
      (match) => match[1] as string,
    )
    expect(groups, 'language, permission and model: three of them').toHaveLength(3)
    for (const cls of groups) {
      expect(cls, 'no wider than what it holds').toContain('w-fit')
      expect(cls, 'stretched to the row, the pill trails off empty').not.toContain('w-full')
    }
  })

  it('writes what the choice means underneath, since a name does not say what changes', () => {
    expect(pane({ permissionMode: 'bypass' })).toContain('Never asks')
    expect(pane({ model: 'haiku' })).toContain('Fast and cheap')
  })
})

describe('being told when the work is done is something you can turn off', () => {
  it('offers the switch and says when it would speak', () => {
    const html = pane()
    expect(html).toContain('Notifications')
    expect(html, 'not knowing when it rings, you cannot decide to turn it on').toContain('behind another window')
  })

  function switchState(html: string): string | undefined {
    const tag = html.split('<').find((one) => one.includes('aria-label="Notifications"'))
    return /data-state="([a-z]+)"/.exec(tag ?? '')?.[1]
  }

  it('shows it on when it is on', () => {
    expect(switchState(pane({ notify: true }))).toBe('checked')
  })

  it('shows it off when it is off', () => {
    expect(switchState(pane({ notify: false }))).toBe('unchecked')
  })
})
