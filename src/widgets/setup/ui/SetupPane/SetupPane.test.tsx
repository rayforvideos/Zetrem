import { renderToStaticMarkup } from 'react-dom/server'
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
  reopened: boolean
  canStart: boolean
  sessionLive: boolean
  authError: string | null
  loginNote: string
  notice: Failure | null
}

function pane(over: Partial<Flat> = {}): string {
  const flat: Flat = {
    auth: null,
    project: null,
    permissionMode: 'ask',
    model: 'default',
    reopened: false,
    canStart: false,
    sessionLive: false,
    authError: null,
    loginNote: '',
    notice: null,
    ...over,
  }
  return renderToStaticMarkup(
    <SetupPane
      account={{
        auth: flat.auth,
        error: flat.authError,
        note: flat.loginNote,
        signingIn: false,
        signingOut: false,
        sessionLive: flat.sessionLive,
        onSignIn: () => {},
        onSignOut: () => {},
      }}
      project={{ chosen: flat.project, onChoose: () => {} }}
      defaults={{
        permissionMode: flat.permissionMode,
        model: flat.model,
        onPermissionMode: () => {},
        onModel: () => {},
      }}
      plugins={{ summary: 'none', onOpen: () => {} }}
      actions={{
        reopened: flat.reopened,
        canStart: flat.canStart,
        onStart: () => {},
        onCancel: () => {},
      }}
      notice={flat.notice}
    />,
  )
}

describe('SetupPane: everything to settle before starting, on one screen', () => {
  it('shows everything there is to settle', () => {
    const html = pane()
    for (const label of ['Account', 'Project', 'Permissions', 'Model', 'Plugins']) {
      expect(html, `${label} 이 없다`).toContain(label)
    }
  })

  it('locks Start without an account and a project, and says why', () => {
    const html = pane()
    expect(html).toContain('Set your account and project first')
    const start = html.slice(html.lastIndexOf('<button', html.indexOf('>Start<')))
    expect(start).toContain('disabled=""')
  })

  it('opens Start once both are set, so the test above cannot pass by accident', () => {
    const html = pane({
      canStart: true,
      auth: { state: 'signed-in', email: 'sam@example.com', orgName: null },
      project: { name: 'zetrem', path: '/tmp/zetrem' },
    })
    const start = html.slice(html.lastIndexOf('<button', html.indexOf('>Start<')))
    expect(start).not.toContain('disabled=""')
    expect(html).not.toContain('Set your account and project first')
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
    expect(html).toContain('>Cancel<')
    expect(html).toContain('>Done<')
    expect(html).not.toContain('>Start<')
  })

  it('puts the main action last, where a desktop expects it', () => {
    const html = pane({ reopened: true, canStart: true })
    expect(html.indexOf('>Cancel<')).toBeLessThan(html.indexOf('>Done<'))
  })

  it('says the CLI is missing instead of offering sign-in', () => {
    const html = pane({ auth: { state: 'cli-missing' } })
    expect(html).toContain('command not found')
  })

  it('sizes the choice pills to their content, and not to the field around them', () => {
    const html = pane()
    const groups = [...html.matchAll(/<div[^>]*data-slot="toggle-group"[^>]*class="([^"]*)"/g)].map(
      (match) => match[1] as string,
    )
    expect(groups, '권한과 모델 두 벌이 선다').toHaveLength(2)
    for (const cls of groups) {
      expect(cls, '내용만큼만 넓어야 한다').toContain('w-fit')
      expect(cls, '칸 전체로 늘어나면 알약 안에 빈 꼬리가 남는다').not.toContain('w-full')
    }
  })

  it('writes what the choice means underneath, since a name does not say what changes', () => {
    expect(pane({ permissionMode: 'bypass' })).toContain('Never asks')
    expect(pane({ model: 'haiku' })).toContain('Fast and cheap')
  })
})
