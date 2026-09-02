import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamSidebar } from './TeamSidebar'
import { SIDEBAR } from '@/shared/config/theme'
import { ROOMY } from '../../lib/chat-search/chat-search'

function bar(props: Partial<Parameters<typeof TeamSidebar>[0]> = {}): string {
  return renderToStaticMarkup(
    <TeamSidebar
      chats={{
        chats: [],
        openId: null,
        live: {},
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      }}
      team={{
        members: [],
        drafts: new Map(),
        knownTools: [],
        sessionUp: false,
        read: [],
        canWrite: true,
        projectOpen: true,
        note: null,
        onHire: () => {},
        onEdit: () => {},
        onRelease: () => {},
        onPick: () => {},
        onAddress: () => {},
        onRestart: () => {},
        hint: false,
        onHintSeen: () => {},
      }}
      agents={{ stock: [], on: [], onChange: () => {} }}
      projects={{
        current: { id: 'p1', path: '/tmp/zetrem', name: 'zetrem' },
        all: [{ id: 'p1', path: '/tmp/zetrem', name: 'zetrem' }],
        onOpen: () => {},
        onPickFolder: () => {},
        onForget: () => {},
      }}
      nowMs={0}
      width={SIDEBAR.width}
      onResize={() => {}}
      onResizeEnd={() => {}}
      onOpenLibrary={() => {}}
      libraryOpen={false}
      libraryUnseen={false}
      libraryPending={0}
      {...props}
    />,
  )
}

describe('TeamSidebar: the column that stacks the sections in order', () => {
  it('names each section, so the column reads as parts and not one list', () => {
    const html = bar()
    expect(html.indexOf('Your team')).toBeGreaterThan(-1)
    expect(html.indexOf('Claude Code')).toBeGreaterThan(html.indexOf('Your team'))
  })

  it('carries no usage, which belongs to the account and not to this column', () => {
    expect(bar()).not.toContain('data-usage')
  })

  it('holds the width it was given, since the drag is owned above it', () => {
    expect(bar({ width: 321 })).toContain('width:321px')
  })

  it('hands the team its own section rather than laying the roster out itself', () => {
    expect(bar({ team: { ...teamOf(), members: [], note: null } })).toContain('No one here yet')
  })
})

function teamOf() {
  return {
    members: [],
    drafts: new Map(),
    knownTools: [],
    sessionUp: false,
    read: [],
    sessionLive: false,
    canWrite: true,
    projectOpen: true,
    hint: false,
    onHintSeen: () => {},
    note: null,
    onHire: () => {},
    onEdit: () => {},
    onRelease: () => {},
    onPick: () => {},
    onAddress: () => {},
    onRestart: () => {},
  }
}

describe('the builtins fold to one line that can open where it stands', () => {
  it('sums the builtins up, shut, with the rows behind a press', () => {
    const html = bar({
      agents: { stock: ['Explore', 'Plan'], on: ['Explore'], onChange: () => {} },
    })
    expect(html).toContain('Your team')
    expect(html).toContain('Claude Code')
    expect(html).toContain('1 of 2 agents on')
    expect(html, 'shut until pressed').not.toContain('Explore')
    expect(html).toContain('data-state="closed"')
  })

  it('says it is still reading while Claude Code has named nobody', () => {
    expect(bar()).toContain('Reading which agents Claude Code brings')
  })
})

describe('the sidebar has no filing layer of its own', () => {
  it('puts the chats straight under the project, with no divider between', () => {
    const html = bar()
    expect(html).not.toContain('New category')
    expect(html).not.toContain('Category name')
    expect(html).not.toContain('aria-current="true"')
  })
})

describe('chats gathered into folders, without hiding the rest', () => {
  const chat = (id: string, folder: string) => ({
    id: `chat-${id}-a`,
    title: id,
    sessionId: null,
    savedAtMs: 1,
    folder,
  })

  it('stands a folder up for the chats filed under it, with how many', () => {
    const html = bar({
      chats: {
        chats: [chat('one', '출고'), chat('two', '출고')],
        openId: null,
        live: {},
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      },
    })
    expect(html).toContain('data-folder="출고"')
    expect(html).toContain('>2<')
  })

  it('keeps a loose chat on the page when another one is filed away', () => {
    const html = bar({
      chats: {
        chats: [chat('filed', '출고'), chat('loose', '')],
        openId: null,
        live: {},
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      },
    })
    expect(html).toContain('loose')
  })

  it('opens the folder that holds the chat you are in', () => {
    const html = bar({
      chats: {
        chats: [chat('open', '출고')],
        openId: 'chat-open-a',
        live: {},
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      },
    })
    expect(html).toContain('aria-expanded="true"')
  })

  it('shows no folder at all until something is filed', () => {
    const html = bar({
      chats: {
        chats: [chat('a', ''), chat('b', '')],
        openId: null,
        live: {},
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      },
    })
    expect(html).not.toContain('data-folder')
  })
})

describe('a way out when the folders stop helping', () => {
  const chat = (id: string, folder = '', title = id) => ({
    id: `chat-${id}-a`,
    title,
    sessionId: null,
    savedAtMs: 1,
    folder,
  })
  const withChats = (chats: ReturnType<typeof chat>[], openId: string | null = null) =>
    bar({
      chats: {
        chats,
        openId,
        live: {},
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      },
    })
  const many = (folder = '') => Array.from({ length: ROOMY + 1 }, (_, at) => chat(`c${at}`, folder))

  it('stays out of the way while the list is short enough to read', () => {
    expect(withChats([chat('one'), chat('two')])).not.toContain('Find a chat')
  })

  it('offers a field once there is more than a folder-full to look through', () => {
    expect(withChats(many())).toContain('Find a chat')
  })

  it('brings the days back inside a folder once walking it stops paying', () => {
    const chats = many('출고')
    const html = withChats(chats, chats[0]!.id)
    expect(html.indexOf('Today')).toBeGreaterThan(html.indexOf('data-folder="출고"'))
  })

  it('leaves a small folder plain, with no day headings to read past', () => {
    const chats = Array.from({ length: 3 }, (_, at) => chat(`c${at}`, '출고'))
    expect(withChats(chats, chats[0]!.id)).not.toContain('Today')
  })
})

describe('carrying a chat onto another to make a place for both', () => {
  const chat = (id: string, folder = '') => ({
    id: `chat-${id}-a`,
    title: id,
    sessionId: null,
    savedAtMs: 1,
    folder,
  })
  const withChats = (chats: ReturnType<typeof chat>[]) =>
    bar({
      chats: {
        chats,
        openId: null,
        live: {},
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      },
    })

  it('lets a chat be picked up', () => {
    expect(withChats([chat('one'), chat('two')])).toContain('draggable="true"')
  })

  it('keeps the menu as the way that needs no dragging', () => {
    expect(withChats([chat('one')])).toContain('More for one')
  })
})

describe('a chat says what it is doing without being opened', () => {
  const chat = {
    id: 'chat-x',
    title: '뒤에서 도는 대화',
    sessionId: null,
    savedAtMs: 1,
    folder: '',
  }
  const withLive = (live: Record<string, 'working' | 'asking'>) =>
    bar({
      chats: {
        chats: [chat],
        openId: null,
        live,
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
        onRename: () => {},
        onFile: () => {},
        onFileMany: () => {},
      },
    })

  it('marks the chat that is waiting on a permission, unopened', () => {
    const html = withLive({ 'chat-x': 'asking' })
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Waiting for your permission"')
  })

  it('marks the chat that is still replying', () => {
    expect(withLive({ 'chat-x': 'working' })).toContain('aria-label="Still replying"')
  })

  it('leaves a chat that is doing nothing unmarked', () => {
    expect(withLive({})).not.toContain('role="img"')
  })
})

describe('the sidebar ends with a way into the library', () => {
  it('ends with a row that opens the library', () => {
    const out = bar()
    expect(out).toContain('data-library-row')
    expect(out).toContain('Library')
  })

  it('lights the row with a dot only once a note has been filed unseen', () => {
    expect(bar()).not.toContain('data-library-unseen')
    const lit = bar({ libraryUnseen: true })
    const at = lit.indexOf('data-library-row')
    expect(lit.slice(at)).toContain('data-library-unseen')
    expect(lit.slice(at)).toContain('size-1.5')
  })

  it('counts what is waiting for a word on the row, and shows nothing when none is', () => {
    const waiting = bar({ libraryPending: 2 })
    const at = waiting.indexOf('data-library-row')
    expect(waiting.slice(at)).toContain('data-library-pending')
    expect(waiting.slice(at)).toMatch(/data-library-pending[^>]*>2</)
    expect(bar()).not.toContain('data-library-pending')
  })

  it('names the count for a screen reader too, not only the digit', () => {
    const waiting = bar({ libraryPending: 2 })
    expect(waiting).toContain('aria-label="2 suggestions waiting"')
    expect(waiting).toContain('title="2 suggestions waiting"')
  })

  it('marks that row as where you are while the library is open', () => {
    const out = bar({ libraryOpen: true })
    const at = out.indexOf('data-library-row')
    expect(at).toBeGreaterThan(-1)
    expect(out.slice(at)).toContain('aria-current="true"')
  })
})

describe('the offer to restart a session that is still up', () => {
  const created = { kind: 'created' as const, name: '시에나' }

  it('keeps offering the restart after the turn has finished', () => {
    const html = bar({
      team: {
        members: [],
        drafts: new Map(),
        knownTools: [],
        sessionUp: true,
        read: [],
        canWrite: true,
        projectOpen: true,
        note: created,
        onHire: () => {},
        onEdit: () => {},
        onRelease: () => {},
        onPick: () => {},
        onAddress: () => {},
        onRestart: () => {},
        hint: false,
        onHintSeen: () => {},
      },
    })
    expect(html).toContain('Restart session')
  })

  it('offers nothing when there is no session behind the note', () => {
    const html = bar({
      team: {
        members: [],
        drafts: new Map(),
        knownTools: [],
        sessionUp: false,
        read: [],
        canWrite: true,
        projectOpen: true,
        note: created,
        onHire: () => {},
        onEdit: () => {},
        onRelease: () => {},
        onPick: () => {},
        onAddress: () => {},
        onRestart: () => {},
        hint: false,
        onHintSeen: () => {},
      },
    })
    expect(html).not.toContain('Restart session')
  })
})
