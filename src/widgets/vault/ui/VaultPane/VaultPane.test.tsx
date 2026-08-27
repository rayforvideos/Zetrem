import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { VaultPane } from './VaultPane'

const NOW = 1_700_000_000_000

const summary = {
  id: 'analysis/api-choice.md',
  folder: 'analysis',
  title: 'api-choice',
  summary: 'Use B',
  source: 'agent' as const,
  tags: ['api'],
  createdAtMs: NOW - 3 * 60_000,
  updatedAtMs: NOW - 3 * 60_000,
}

const mine = {
  ...summary,
  id: 'scratch.md',
  folder: '',
  title: 'scratch',
  summary: 'My own',
  source: 'person' as const,
  tags: ['todo'],
}

const note = { ...summary, body: '## Why\nWe weighed both.', session: null }

function pane(over: Partial<Parameters<typeof VaultPane>[0]> = {}): string {
  return renderToStaticMarkup(
    <VaultPane
      folders={[{ name: 'analysis' }, { name: 'sources' }]}
      notes={[summary, mine]}
      hits={null}
      query=""
      filter="all"
      tag={null}
      open={null}
      backlinks={[]}
      loading={false}
      editing={false}
      fresh={false}
      guideOpen={false}
      savedAtMs={null}
      nowMs={NOW}
      onQuery={() => {}}
      onFilter={() => {}}
      onTag={() => {}}
      onOpen={() => {}}
      onOpenTitle={() => {}}
      onOpenGuide={() => {}}
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
      sidebar={null}
      {...over}
    />,
  )
}

describe('VaultPane', () => {
  it('says what the vault is for when it is empty, and offers the first note', () => {
    const out = pane({ notes: [] })
    expect(out).toContain('The vault is empty')
    expect(out).toContain('Agents search here before they answer.')
    expect(out).toContain('The bolt on an answer files it here.')
    expect(out).toContain('You can write here too.')
    expect(out).toContain('Write the first note')
    expect(out).toContain('lucide-library')
  })

  it('reads the vault while it loads, without the empty state', () => {
    const out = pane({ notes: [], loading: true })
    expect(out).toContain('Reading the vault')
    expect(out).not.toContain('The vault is empty')
  })

  it('lists rows with a source glyph, a summary and a relative time, grouped by folder', () => {
    const out = pane()
    expect(out).toContain('data-note-row="analysis/api-choice.md" data-source="agent"')
    expect(out).toContain('data-note-row="scratch.md" data-source="person"')
    expect(out).toContain('lucide-bot')
    expect(out).toContain('lucide-user')
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

  it('presses the filter chip that is on, and one chip per tag in use', () => {
    const out = pane({ filter: 'agent', tag: 'todo' })
    expect(out).toContain('data-filter-chip="agent" aria-pressed="true"')
    expect(out).toContain('data-filter-chip="all" aria-pressed="false"')
    expect(out).toContain('data-filter-chip="tag:todo" aria-pressed="true"')
    expect(out).toContain('data-filter-chip="tag:api" aria-pressed="false"')
    expect(out).not.toContain('data-note-row="scratch.md"')
  })

  it('reaches the guide from the header, not a pinned row', () => {
    const out = pane({ guideOpen: true })
    expect(out).toContain('data-guide-button')
    expect(out).toMatch(/data-guide-button[^>]*aria-current="true"/)
    expect(out).not.toContain('data-guide-row')
  })

  it('renders the open note as markdown with wikilinks resolved, and one meta line', () => {
    const out = pane({ open: { ...note, body: 'See [[scratch]] and [[missing]].' } })
    expect(out).toContain('href="#vault/scratch"')
    expect(out).not.toContain('[[missing]]')
    expect(out).toContain('data-note-meta')
    expect(out).toContain('Agent')
    expect(out).toContain('data-tag="api"')
    expect(out).toContain('aria-current="true"')
    expect(out.match(/Use B/g)).toHaveLength(1)
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

  it('edits the guide as a plain body, with no delete', () => {
    const out = pane({
      editing: true,
      guideOpen: true,
      open: { ...note, id: 'CLAUDE.md', folder: '', title: 'CLAUDE.md', tags: [] },
    })
    expect(out).toContain('<textarea')
    expect(out).not.toContain('data-note-delete')
    expect(out).not.toContain('data-tags-field')
  })

  it('starts a new note at the root or in a folder, and a new folder at the foot', () => {
    const out = pane()
    expect(out).toContain('data-new-note')
    expect(out).toContain('New note')
    expect(out).toContain('aria-label="New note in analysis"')
    expect(out).toContain('New folder')
  })

  it('refuses to remove a folder that still holds notes', () => {
    const out = pane()
    expect(out).toContain('data-folder-menu="analysis" data-removable="false"')
    expect(out).toContain('data-folder-menu="sources" data-removable="true"')
  })
})
