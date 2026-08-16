import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamList } from './TeamList'
import type { TeamMember } from '../../lib/team/team.types'

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    type: 'code-reviewer',
    name: 'code-reviewer',
    description: 'Looks at what changed',
    model: 'sonnet',
    character: null,
    origin: 'project',
    loaded: false,
    callable: false,
    state: 'idle',
    note: null,
    sessionId: null,
    ...overrides,
  }
}

function list(props: Partial<Parameters<typeof TeamList>[0]> = {}): string {
  return renderToStaticMarkup(
    <TeamList
      members={[member()]}
      drafts={new Map()}
      knownTools={[]}
      sessionKnown={false}
      read={[]}
      sessionLive={false}
      canWrite
      note={null}
      avatar={24}
      onHire={() => {}}
      onEdit={() => {}}
      onRelease={() => {}}
      onPick={() => {}}
      onAddress={() => {}}
      onRestart={() => {}}
      {...props}
    />,
  )
}

function row(html: string): string {
  const at = html.lastIndexOf('<button', html.indexOf('data-member='))
  return html.slice(at, html.indexOf('</button>', at))
}

describe('TeamList: pressing something always does something', () => {
  it('leaves the outcome on screen, whether it worked or not', () => {
    expect(list({ note: { kind: 'trouble', text: 'Restart Zetrem' } })).toContain('Restart Zetrem')
    expect(list({ note: { kind: 'created', name: 'Nova' } })).toContain('Nova is ready')
  })

  it('offers the restart button while a session runs, instead of only mentioning it', () => {
    expect(list({ note: { kind: 'created', name: 'Nova' }, sessionLive: true })).toContain(
      'Restart session',
    )
    expect(list({ note: { kind: 'created', name: 'Nova' }, sessionLive: false })).not.toContain(
      'Restart session',
    )
  })

  it('locks hiring without a project and says why', () => {
    const html = list({ canWrite: false })
    const button = html.slice(html.lastIndexOf('<button', html.indexOf('>Add teammate<')))
    expect(button).toContain('disabled=""')
    expect(button).toContain('Pick a project first')
  })

  it('dims nobody before a session exists, since unknown is not no', () => {
    expect(row(list())).toContain('text-foreground')
    expect(row(list({ sessionKnown: true }))).toContain('text-muted-foreground')
  })

  it('keeps someone the session knows at full strength', () => {
    const html = list({ sessionKnown: true, members: [member({ loaded: true, callable: true })] })
    expect(row(html)).toContain('text-foreground')
  })

  it('says so rather than showing an empty column when nobody is hired', () => {
    expect(list({ members: [] })).toContain('No one here yet')
  })
})

describe('a name on the roster is something you can press', () => {
  it('opens the report when you press someone who is working', () => {
    const button = row(list({ members: [member({ state: 'working', sessionId: 's1' })] }))
    expect(button).toContain('See what they did')
    expect(button).not.toContain('disabled="')
  })

  it('addresses the next task to someone who is idle', () => {
    const button = row(list({ sessionKnown: true, members: [member({ loaded: true, callable: true })] }))
    expect(button).toContain('Give them a task')
  })

  it('cannot press someone this session does not know, since calling would not reach them', () => {
    const button = row(list({ sessionKnown: true, members: [member({ loaded: false })] }))
    expect(button).toContain('disabled=""')
    expect(button).toContain('next session')
  })

  it('leaves someone uncallable unpressable, with the reason attached', () => {
    const button = row(list({ sessionKnown: true, members: [member({ loaded: true, callable: false })] }))
    expect(button).toContain('disabled=""')
    expect(button).toContain('Not available this session')
  })
})

describe('someone you hired can be edited or let go', () => {
  it('gives each row a menu named after that person', () => {
    expect(list({ members: [member({ name: 'code-reviewer' })] })).toContain('More for code-reviewer')
  })

  it('keeps the menu out of sight until wanted, so it is not pressed by accident', () => {
    const html = list()
    const at = html.indexOf('More for')
    expect(html.slice(html.lastIndexOf('<button', at), at)).toContain('opacity-0')
  })
})

describe('the light on a row', () => {
  const ran = {
    ...member(),
    name: 'Joi',
    type: 'explore',
    state: 'idle' as const,
    sessionId: 'run-1',
  }

  it('lights a run you have not opened', () => {
    expect(row(list({ members: [ran] }))).toContain('bg-card')
  })

  it('goes quiet once you have read that run', () => {
    expect(row(list({ members: [ran], read: ['run-1'] }))).not.toContain('bg-card')
  })

  it('leaves someone who has not run at all plain', () => {
    expect(row(list({ members: [{ ...ran, sessionId: null }] }))).not.toContain('bg-card')
  })

  it('never puts a dot beside the name', () => {
    expect(list({ members: [ran] })).not.toContain('data-ran')
  })
})

describe('a run you have already read', () => {
  const back = { ...member(), name: 'Joi', type: 'explore', state: 'done' as const, sessionId: 'run-1' }

  it('says they reported back until you have looked', () => {
    expect(list({ members: [back] })).toContain('Reported back')
  })

  it('goes back to what they are for, once you have looked', () => {
    const out = list({ members: [back], read: ['run-1'] })
    expect(out).not.toContain('Reported back')
    expect(out).toContain('Looks at what changed')
  })

  it('still says it for a run you have not opened', () => {
    expect(list({ members: [back], read: ['other'] })).toContain('Reported back')
  })
})

describe('a name that has been read goes back to being a name', () => {
  const back = {
    ...member(),
    name: 'Joi',
    type: 'explore',
    state: 'done' as const,
    sessionId: 'run-1',
    note: '# `src/app/` 정리 결과 ...',
  }

  it('says they reported back until you have read it', () => {
    expect(list({ members: [back] })).toContain('Reported back')
  })

  it('drops the state and what they said once you have read it', () => {
    const out = list({ members: [back], read: ['run-1'] })
    expect(out).not.toContain('src/app/')
    expect(out).not.toContain('Reported back')
    expect(out).toContain('Looks at what changed')
  })

  it('keeps showing a working teammate their own line, read or not', () => {
    const busy = { ...back, state: 'working' as const }
    expect(list({ members: [busy], read: ['run-1'] })).toContain('src/app/')
  })
})
