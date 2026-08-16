import { describe, expect, it } from 'vitest'
import type { Attached } from './attachment.types'
import {
  IMAGE_MAX_BYTES,
  alreadyHeld,
  heavyLine,
  imageTypeOf,
  kindOf,
  nameOf,
  pathsLine,
  sentOf,
  tooHeavy,
  withPaths,
} from './attachment'

function file(overrides: Partial<Attached> = {}): Attached {
  return {
    path: '/w/notes.md',
    name: 'notes.md',
    kind: 'file',
    bytes: 100,
    mediaType: null,
    data: null,
    ...overrides,
  }
}

const shot = file({
  path: '/w/shot.png',
  name: 'shot.png',
  kind: 'image',
  mediaType: 'image/png',
  data: 'AAA',
})

describe('what kind of thing was attached', () => {
  it('knows a picture by what it is, whatever the case of its name', () => {
    expect(kindOf('/w/a.PNG')).toBe('image')
    expect(imageTypeOf('/w/a.jpeg')).toBe('image/jpeg')
    expect(kindOf('/w/a.md')).toBe('file')
    expect(imageTypeOf('/w/README')).toBeNull()
  })

  it('takes the last part of the path as the name', () => {
    expect(nameOf('/a/b/c.txt')).toBe('c.txt')
    expect(nameOf('bare.txt')).toBe('bare.txt')
  })
})

describe('a picture too heavy to send', () => {
  it('refuses only the picture, and says how to get it there anyway', () => {
    expect(tooHeavy({ kind: 'image', bytes: IMAGE_MAX_BYTES + 1 })).toBe(true)
    expect(tooHeavy({ kind: 'image', bytes: IMAGE_MAX_BYTES })).toBe(false)
    expect(tooHeavy({ kind: 'file', bytes: IMAGE_MAX_BYTES * 9 })).toBe(false)
    expect(heavyLine('huge.png')).toContain('huge.png')
  })
})

describe('what rides along with the message', () => {
  it('sends a file by its path, so nothing is pasted into the prompt', () => {
    expect(withPaths('look at this', [file()])).toContain('/w/notes.md')
    expect(withPaths('look at this', [file()]).startsWith('look at this')).toBe(true)
  })

  it('says nothing extra when only pictures were attached', () => {
    expect(pathsLine([shot])).toBe('')
    expect(withPaths('what is this', [shot])).toBe('what is this')
  })

  it('keeps no picture data in what the chat remembers', () => {
    expect(sentOf([shot, file()])).toEqual([
      { name: 'shot.png', kind: 'image', path: '/w/shot.png' },
      { name: 'notes.md', kind: 'file', path: '/w/notes.md' },
    ])
  })

  it('does not take the same file twice', () => {
    expect(alreadyHeld([file()], '/w/notes.md')).toBe(true)
    expect(alreadyHeld([file()], '/w/other.md')).toBe(false)
  })
})
