import { describe, expect, it } from 'vitest'
import { parseNote } from './frontmatter'

function headed(lines: string[]): string {
  return ['---', ...lines, '---', 'First paragraph.', '', 'Second.', ''].join('\n')
}

describe('a note an earlier version wrote as a file', () => {
  it('reads the head and the body under it', () => {
    const text = headed([
      'title: 서브에이전트 호출 구조',
      'created: 2026-08-28T01:12:03.000Z',
      'updated: 2026-08-28T01:40:11.000Z',
      'tags: [cli, probe]',
      'source: agent',
    ])
    expect(parseNote(text)).toEqual({
      meta: {
        title: '서브에이전트 호출 구조',
        created: '2026-08-28T01:12:03.000Z',
        updated: '2026-08-28T01:40:11.000Z',
        tags: ['cli', 'probe'],
        source: 'agent',
      },
      body: 'First paragraph.\n\nSecond.',
    })
  })

  it('unwraps a title that was quoted because it would read as YAML syntax', () => {
    const text = headed(['title: "a: b # not a comment [x]"'])
    expect(parseNote(text).meta?.title).toBe('a: b # not a comment [x]')
    expect(parseNote(headed(["title: 'it''s here'"])).meta?.title).toBe("it's here")
  })

  it('passes over a key it does not know', () => {
    const parsed = parseNote(['---', 'title: T', 'author: ray', '---', 'x', ''].join('\n'))
    expect(parsed.meta).toEqual({ title: 'T', created: '', updated: '', tags: [], source: '' })
    expect(parsed.body).toBe('x')
  })

  it('treats a file with no head as a body only', () => {
    expect(parseNote('Just words\n\nMore')).toEqual({ meta: null, body: 'Just words\n\nMore' })
    expect(parseNote('')).toEqual({ meta: null, body: '' })
  })

  it('does not mistake a rule inside the body for a head', () => {
    expect(parseNote('Intro\n---\nnot: meta\n---\n').meta).toBeNull()
  })

  it('falls back for a head with unusable values', () => {
    const parsed = parseNote(['---', 'title: T', 'tags: nope', '---', 'b'].join('\n'))
    expect(parsed.meta?.tags).toEqual([])
    expect(parsed.meta?.created).toBe('')
    expect(parsed.body).toBe('b')
  })

  it('accepts a head that ends the file with no body', () => {
    expect(parseNote(['---', 'title: T', '---'].join('\n'))).toEqual({
      meta: { title: 'T', created: '', updated: '', tags: [], source: '' },
      body: '',
    })
  })
})
