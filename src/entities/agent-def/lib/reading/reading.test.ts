import { describe, expect, it } from 'vitest'
import { addReading, readable, readingPath, shortPath } from './reading'

describe('what a teammate can be told to read', () => {
  it('takes notes and data, and turns away a screenshot', () => {
    expect(readable('/a/b/SKILL.md')).toBe(true)
    expect(readable('/a/b/notes.YAML')).toBe(true)
    expect(readable('/a/b/shot.png')).toBe(false)
    expect(readable('/a/b/Makefile')).toBe(false)
  })

  it('shortens a path inside the project and leaves an outside one whole', () => {
    expect(shortPath('/work/app/docs/api.md', '/work/app')).toBe('docs/api.md')
    expect(shortPath('/home/me/.claude/skills/x/SKILL.md', '/work/app')).toBe(
      '/home/me/.claude/skills/x/SKILL.md',
    )
    expect(shortPath('/work/app/docs/api.md', null)).toBe('/work/app/docs/api.md')
  })

  it('splits a row into the file and where it lives', () => {
    expect(readingPath('docs/api.md')).toEqual({ name: 'api.md', where: 'docs' })
    expect(readingPath('api.md')).toEqual({ name: 'api.md', where: '' })
  })

  it('adds what it can read, once each, keeping the order they arrived', () => {
    expect(addReading(['a.md'], ['b.md', 'a.md', 'c.png', '', 'd.txt'])).toEqual([
      'a.md',
      'b.md',
      'd.txt',
    ])
  })
})
