import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NoteEditor } from './NoteEditor'

const note = {
  id: 'analysis/api-choice.md',
  folder: 'analysis',
  title: 'api-choice',
  lead: 'Use B',
  updatedAtMs: 1_700_000_000_000,
  text: 'Use B\nforceteller-cs\n\n## Why\nWe weighed both.',
}

function editor(over: Partial<Parameters<typeof NoteEditor>[0]> = {}): string {
  return renderToStaticMarkup(
    <NoteEditor
      note={note}
      title={note.title}
      onChange={() => {}}
      onTitle={() => Promise.resolve(true)}
      guide={false}
      fresh={false}
      meta={<p>analysis</p>}
      actions={null}
      {...over}
    />,
  )
}

describe('NoteEditor', () => {
  it('puts the note text in a textarea and the title in an input', () => {
    const out = editor()
    expect(out).toContain('<textarea')
    expect(out).toContain('We weighed both.')
    expect(out).toContain('value="api-choice"')
  })

  it('opens on the body of a note that was already written', () => {
    const out = editor()
    expect(out).toMatch(/<textarea[^>]*autofocus/)
    expect(out).not.toMatch(/<input[^>]*autofocus/)
  })

  it('opens on the title of a note that was just made', () => {
    const out = editor({ fresh: true, note: { ...note, text: '' }, title: 'New note' })
    expect(out).toMatch(/<input[^>]*autofocus/)
    expect(out).not.toMatch(/<textarea[^>]*autofocus/)
  })

  it('has no title field for the guide, which is not renamed', () => {
    const out = editor({ guide: true, title: 'CLAUDE.md' })
    expect(out).toContain('<textarea')
    expect(out).not.toContain('<input')
  })
})
