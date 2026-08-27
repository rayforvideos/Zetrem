import { describe, expect, it } from 'vitest'
import { parseNote, serializeNote } from './frontmatter'
import type { NoteMeta } from './frontmatter.types'

const META: NoteMeta = {
  title: '서브에이전트 호출 구조',
  created: '2026-08-28T01:12:03.000Z',
  updated: '2026-08-28T01:40:11.000Z',
  source: 'agent',
  session: '3f9c-aa',
  tags: ['cli', 'probe'],
  rest: {},
}

describe('a note is frontmatter and a body', () => {
  it('reads back what it wrote', () => {
    const text = serializeNote(META, 'First paragraph.\n\nSecond.')
    expect(parseNote(text)).toEqual({ meta: META, body: 'First paragraph.\n\nSecond.' })
  })

  it('writes the head in a fixed order, tags inline, nothing for an absent session', () => {
    expect(serializeNote({ ...META, session: null, tags: [] }, 'Body')).toBe(
      [
        '---',
        'title: 서브에이전트 호출 구조',
        'created: 2026-08-28T01:12:03.000Z',
        'updated: 2026-08-28T01:40:11.000Z',
        'source: agent',
        '---',
        'Body',
        '',
      ].join('\n'),
    )
  })

  it('keeps a title that would read as YAML syntax intact', () => {
    const meta = { ...META, title: 'a: b # not a comment [x]' }
    expect(parseNote(serializeNote(meta, '')).meta?.title).toBe('a: b # not a comment [x]')
  })

  it('keeps keys it does not know and writes them back', () => {
    const text = ['---', 'title: T', 'source: person', 'mood: calm', '---', 'x', ''].join('\n')
    const parsed = parseNote(text)
    expect(parsed.meta?.rest).toEqual({ mood: 'calm' })
    expect(parseNote(serializeNote(parsed.meta as NoteMeta, 'x')).meta?.rest).toEqual({
      mood: 'calm',
    })
  })

  it('treats a file with no head as a body only', () => {
    expect(parseNote('Just words\n\nMore')).toEqual({ meta: null, body: 'Just words\n\nMore' })
    expect(parseNote('')).toEqual({ meta: null, body: '' })
  })

  it('does not mistake a rule inside the body for a head', () => {
    const text = 'Intro\n---\nnot: meta\n---\n'
    expect(parseNote(text).meta).toBeNull()
  })

  it('falls back for a head with unusable values', () => {
    const text = ['---', 'title: T', 'source: robot', 'tags: nope', '---', 'b'].join('\n')
    const parsed = parseNote(text)
    expect(parsed.meta?.source).toBe('person')
    expect(parsed.meta?.tags).toEqual([])
    expect(parsed.meta?.created).toBe('')
    expect(parsed.body).toBe('b')
  })

  it('accepts a head that ends the file with no body', () => {
    const text = ['---', 'title: T', '---'].join('\n')
    expect(parseNote(text)).toEqual({
      meta: {
        ...META,
        title: 'T',
        created: '',
        updated: '',
        source: 'person',
        session: null,
        tags: [],
      },
      body: '',
    })
  })
})
