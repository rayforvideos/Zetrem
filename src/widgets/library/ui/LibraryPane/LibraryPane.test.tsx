import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LibraryPane } from './LibraryPane'

const NOW = 1_700_000_000_000

const summary = {
  id: 'analysis/api-choice.md',
  folder: 'analysis',
  title: 'api-choice',
  summary: 'Use B',
  tags: ['api'],
  source: '',
  createdAtMs: NOW - 3 * 60_000,
  updatedAtMs: NOW - 3 * 60_000,
}

const mine = {
  ...summary,
  id: 'scratch.md',
  folder: '',
  title: 'scratch',
  summary: 'My own',
  tags: ['todo'],
  source: '',
}

const note = { ...summary, body: '## Why\nWe weighed both.' }

const suggested = {
  id: 'p1',
  folder: '',
  title: 'Auth choice',
  body: 'We went with sessions.\n\nThe long reasoning.',
  tags: ['auth'],
  proposedAtMs: NOW - 60_000,
  session: '',
  by: '',
}

function pane(over: Partial<Parameters<typeof LibraryPane>[0]> = {}): string {
  return renderToStaticMarkup(
    <LibraryPane
      folders={[{ name: 'analysis' }, { name: 'sources' }]}
      notes={[summary, mine]}
      hits={null}
      query=""
      tag={null}
      open={null}
      backlinks={[]}
      loading={false}
      editing={false}
      fresh={false}
      savedAtMs={null}
      nowMs={NOW}
      onQuery={() => {}}
      onTag={() => {}}
      onOpen={() => {}}
      onOpenTitle={() => {}}
      onClose={() => {}}
      onCreate={() => {}}
      onRemove={() => {}}
      onStartEdit={() => {}}
      onStopEdit={() => {}}
      onSave={() => {}}
      onRename={() => Promise.resolve(true)}
      onTags={() => {}}
      onAddFolder={() => {}}
      onRenameFolder={() => {}}
      onRemoveFolder={() => {}}
      proposals={[]}
      chatTitleOf={() => null}
      onAcceptProposal={() => {}}
      onDismissProposal={() => {}}
      sidebar={null}
      {...over}
    />,
  )
}

describe('LibraryPane', () => {
  it('says what the library is for when it is empty, and offers the first note', () => {
    const out = pane({ notes: [] })
    expect(out).toContain('No notes yet')
    expect(out).toContain('“To library” under an answer files it here.')
    expect(out).toContain(
      'Agents suggest what they learn, and nothing lands here until you accept it.',
    )
    expect(out).toContain('Write the first note')
    expect(out).toContain('lucide-library')
  })

  it('reads the library while it loads, without the empty state', () => {
    const out = pane({ notes: [], loading: true })
    expect(out).toContain('Reading the library')
    expect(out).not.toContain('No notes yet')
  })

  it('lists rows with a summary and a relative time, grouped by folder', () => {
    const out = pane()
    expect(out).toContain('data-note-row="analysis/api-choice.md"')
    expect(out).toContain('data-note-row="scratch.md"')
    expect(out).toContain('Use B')
    expect(out).toContain('3m ago')
    expect(out).toContain('data-folder="analysis"')
    expect(out).toContain('data-folder="sources"')
    expect(out.indexOf('data-note-row="scratch.md"')).toBeLessThan(out.indexOf('data-folder='))
    expect(out).toContain('Pick a note')
  })

  it('shows the hits with their snippet while searching, and a quiet line when none match', () => {
    const out = pane({ query: 'weigh', hits: [{ ...summary, snippet: '…we weighed both…' }] })
    expect(out).toContain('data-hits')
    expect(out).toContain('…we weighed both…')
    expect(out).not.toContain('data-folder=')
    expect(pane({ query: 'zzz', hits: [] })).toContain('Nothing matches')
  })

  it('presses the tag chip that is on, one chip per tag in use', () => {
    const out = pane({ tag: 'todo' })
    expect(out).toContain('data-filter-chip="tag:todo" aria-pressed="true"')
    expect(out).toContain('data-filter-chip="tag:api" aria-pressed="false"')
    expect(out).toContain('data-note-row="scratch.md"')
    expect(out).not.toContain('data-note-row="analysis/api-choice.md"')
  })

  it('has a help button in the header, not a pinned guide row', () => {
    const out = pane()
    expect(out).toContain('data-guide-button')
    expect(out).not.toContain('data-guide-row')
  })

  it('renders the open note as markdown with wikilinks resolved, and one meta line', () => {
    const out = pane({ open: { ...note, body: 'See [[scratch]] and [[missing]].' } })
    expect(out).toContain('href="#library/scratch"')
    expect(out).not.toContain('[[missing]]')
    expect(out).toContain('data-note-meta')
    expect(out).toContain('data-tag="api"')
    expect(out).toContain('data-tag="api"')
    expect(out).toContain('aria-current="true"')
    expect(out.match(/Use B/g)).toHaveLength(1)
  })

  it('lets the note and the list take turns when the pane is narrow, with a way back', () => {
    const closed = pane()
    expect(closed).not.toContain('Back to the list')
    expect(closed).toMatch(/data-library-list[^>]*@max-\[40rem\]\/library:w-full/)
    expect(closed).toMatch(/data-library-note[^>]*@max-\[40rem\]\/library:hidden/)
    const opened = pane({ open: note })
    expect(opened).toContain('aria-label="Back to the list"')
    expect(opened).toMatch(/data-library-list[^>]*@max-\[40rem\]\/library:hidden/)
    expect(opened).not.toMatch(/data-library-note[^>]*@max-\[40rem\]\/library:hidden/)
  })

  it('lists the notes that link here after the body', () => {
    const out = pane({ open: note, backlinks: [mine] })
    expect(out).toContain('data-backlinks')
    expect(out).toContain('Linked from')
    expect(out.lastIndexOf('scratch')).toBeGreaterThan(out.indexOf('data-backlinks'))
    expect(pane({ open: note })).not.toContain('Linked from')
  })

  it('edits in place with a saved line once the autosave has landed', () => {
    const out = pane({ editing: true, open: note, savedAtMs: NOW - 10_000 })
    expect(out).toContain('<textarea')
    expect(out).toContain('Done')
    expect(out).toContain('Saved · just now')
    expect(pane({ editing: true, open: note })).not.toContain('data-saved')
  })

  it('can delete the note it is editing, with nothing asked yet', () => {
    const out = pane({ editing: true, open: note })
    expect(out).toContain('data-note-delete')
    expect(out).not.toContain('This cannot be undone')
  })

  it('creates from one menu in the header, and from the folder a note belongs in', () => {
    const out = pane()
    expect(out).toContain('data-new-menu')
    expect(out).toContain('aria-label="New note in analysis"')
    expect(out).not.toContain('New folder')
  })

  it('counts the notes beside the title, and not when there are none', () => {
    expect(pane()).toMatch(/data-note-count[^>]*>2</)
    expect(pane({ notes: [] })).not.toContain('data-note-count')
  })

  it('says in the meta line who filed the note and where it sits', () => {
    const agent = { ...note, source: 'agent' }
    const out = pane({ open: agent })
    expect(out).toContain('data-note-source="agent"')
    expect(out).toContain('Filed by an agent')
    expect(out).toMatch(/data-note-folder[^>]*>analysis</)
    const mine = { ...note, id: 'scratch.md', folder: '', source: '' }
    expect(pane({ open: mine })).not.toContain('data-note-source')
  })

  it('puts what agents have suggested at the top, and hides the section when none wait', () => {
    const out = pane({ proposals: [suggested, { ...suggested, id: 'p2', title: 'Later' }] })
    expect(out).toContain('Waiting for you')
    expect(out).toContain('data-proposal="p1"')
    expect(out).toContain('data-proposal="p2"')
    expect(out).toContain('Auth choice')
    expect(out).toContain('We went with sessions.')
    expect(out).toContain('data-tag="auth"')
    expect(out).toContain('Accept')
    expect(out).toContain('Dismiss')
    expect(out.indexOf('Waiting for you')).toBeLessThan(out.indexOf('data-note-row='))
    expect(pane()).not.toContain('Waiting for you')
  })

  it('keeps the rest of a suggestion folded away until it is asked for', () => {
    const out = pane({ proposals: [suggested] })
    expect(out).not.toContain('The long reasoning.')
  })

  it('refuses to remove a folder that still holds notes', () => {
    const out = pane()
    expect(out).toContain('data-folder-menu="analysis" data-removable="false"')
    expect(out).toContain('data-folder-menu="sources" data-removable="true"')
  })
})
