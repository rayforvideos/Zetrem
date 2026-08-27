import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NoteEditor } from './NoteEditor'

const note = {
  id: 'analysis/api-choice.md',
  folder: 'analysis',
  title: 'api-choice',
  summary: 'Use B',
  source: 'agent' as const,
  tags: ['api', 'billing'],
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
  body: '## Why\nWe weighed both.',
  session: null,
}

function editor(over: Partial<Parameters<typeof NoteEditor>[0]> = {}): string {
  return renderToStaticMarkup(
    <NoteEditor
      note={note}
      guide={false}
      fresh={false}
      onChange={() => {}}
      onTitle={() => Promise.resolve(true)}
      onTags={() => {}}
      {...over}
    />,
  )
}

describe('NoteEditor', () => {
  it('puts the body in a textarea, the title in an input and the tags in a field', () => {
    const out = editor()
    expect(out).toContain('<textarea')
    expect(out).toContain('We weighed both.')
    expect(out).toContain('value="api-choice"')
    expect(out).toContain('value="api, billing"')
    expect(out).not.toContain('font-mono')
  })

  it('opens on the body of a note that was already written', () => {
    const out = editor()
    expect(out).toMatch(/<textarea[^>]*autofocus/)
    expect(out).not.toMatch(/<input[^>]*autofocus/)
  })

  it('opens on the title of a note that was just made', () => {
    const out = editor({ fresh: true, note: { ...note, body: '', title: 'New note' } })
    expect(out).toMatch(/<input[^>]*autofocus/)
    expect(out).not.toMatch(/<textarea[^>]*autofocus/)
  })

  it('has no title or tags field for the guide, which is a plain body', () => {
    const out = editor({ guide: true, note: { ...note, id: 'CLAUDE.md', title: 'CLAUDE.md' } })
    expect(out).toContain('<textarea')
    expect(out).not.toContain('<input')
  })
})
