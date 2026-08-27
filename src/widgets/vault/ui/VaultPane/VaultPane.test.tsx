import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { VaultPane } from './VaultPane'

const summary = {
  id: 'analysis/api-choice.md',
  folder: 'analysis',
  title: 'api-choice',
  lead: 'Use B',
  updatedAtMs: 1_700_000_000_000,
}

function pane(over: Partial<Parameters<typeof VaultPane>[0]> = {}): string {
  return renderToStaticMarkup(
    <VaultPane
      folders={[
        { name: 'analysis' },
        { name: 'sources' },
        { name: 'outputs' },
        { name: 'taste' },
      ]}
      notes={[summary]}
      open={null}
      loading={false}
      onOpen={() => {}}
      onOpenTitle={() => {}}
      onRemove={() => {}}
      editing={false}
      fresh={false}
      guideOpen={false}
      onStartEdit={() => {}}
      onStopEdit={() => {}}
      onSave={() => {}}
      onRename={() => Promise.resolve(true)}
      onCreate={() => {}}
      onOpenGuide={() => {}}
      onAddFolder={() => {}}
      onRenameFolder={() => {}}
      onRemoveFolder={() => {}}
      sidebar={null}
      {...over}
    />,
  )
}

describe('VaultPane', () => {
  it('lists notes under their folder with the lead line', () => {
    const out = pane()
    expect(out).toContain('analysis')
    expect(out).toContain('api-choice')
    expect(out).toContain('Use B')
    expect(out).toContain('Pick a note')
  })

  it('says how the vault fills when it is empty', () => {
    const out = pane({ notes: [] })
    expect(out).toContain('The vault is empty')
    expect(out).toContain('press the bolt to file it here')
  })

  it('reads the vault while it loads, without the empty state', () => {
    const out = pane({ notes: [], loading: true })
    expect(out).toContain('Reading the vault')
    expect(out).not.toContain('The vault is empty')
  })

  it('names the screen', () => {
    expect(pane()).toContain('Vault')
  })

  it('stands every folder up, with a count on the ones that hold notes', () => {
    const out = pane()
    expect(out).toContain('data-folder="analysis"')
    expect(out).toContain('data-folder="sources"')
    expect(out).not.toContain('Conclusions')
    expect(out).not.toContain('Sources')
  })

  it('reads the first lines as the note meta and does not repeat them in the body', () => {
    const out = pane({
      open: { ...summary, text: 'Use B\nforceteller-cs\n\n## Why\nWe weighed both.' },
    })
    expect(out).toContain('from forceteller-cs')
    expect(out).toContain('We weighed both.')
    expect(out).toContain('Why')
    expect(out.match(/forceteller-cs/g)).toHaveLength(1)
  })

  it('renders the open note as markdown with wikilinks resolved to vault links', () => {
    const out = pane({
      open: { ...summary, text: '# api-choice\nSee [[api-choice]] and [[missing]].' },
    })
    expect(out).toContain('href="#vault/api-choice"')
    expect(out).not.toContain('[[missing]]')
    expect(out).toContain('missing')
    expect(out).toContain('aria-current="true"')
  })

  it('edits the open note in place, in a textarea', () => {
    const out = pane({
      editing: true,
      open: { ...summary, text: 'Use B\nforceteller-cs\n\n## Why\nWe weighed both.' },
    })
    expect(out).toContain('<textarea')
    expect(out).toContain('Done')
  })

  it('can still delete the note it is editing, with nothing asked yet', () => {
    const out = pane({ editing: true, open: { ...summary, text: 'Use B' } })
    expect(out).toContain('Delete')
    expect(out).not.toContain('This cannot be undone')
  })

  it('keeps the guide one row above the folders', () => {
    const out = pane()
    expect(out).toContain('data-guide-row')
    expect(out).toContain('Vault guide')
  })

  it('starts a new note from the folder it belongs in', () => {
    expect(pane()).toContain('aria-label="New note in analysis"')
  })

  it('offers a new folder at the foot of the list', () => {
    expect(pane()).toContain('New folder')
  })

  it('hangs a menu on every folder header', () => {
    expect(pane()).toContain('aria-label="More options for the folder analysis"')
  })

  it('refuses to remove a folder that still holds notes', () => {
    const out = pane()
    expect(out).toContain('data-folder-menu="analysis" data-removable="false"')
    expect(out).toContain('data-folder-menu="sources" data-removable="true"')
  })

  it('names a folder without tacking a description onto it', () => {
    const out = pane({
      folders: [{ name: 'analysis' }],
      notes: [],
    })
    expect(out).toContain('data-folder="analysis"')
    expect(out).not.toContain('Conclusions')
  })
})
