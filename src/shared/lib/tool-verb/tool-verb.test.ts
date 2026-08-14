import { describe, expect, it } from 'vitest'
import { shapeOfLine } from '../tool-line/tool-line'
import { targetOf, verbOf } from './tool-verb'

describe('verbOf: what is happening, in one word', () => {
  it('gives each tool its own verb', () => {
    expect(verbOf(shapeOfLine('Read src/a.ts'))).toBe('Reading')
    expect(verbOf(shapeOfLine('Edit src/a.ts'))).toBe('Editing')
    expect(verbOf(shapeOfLine('Write src/a.ts'))).toBe('Writing')
    expect(verbOf(shapeOfLine('Bash npm test'))).toBe('Running')
    expect(verbOf(shapeOfLine('Grep case'))).toBe('Searching')
    expect(verbOf(shapeOfLine('WebFetch https://x.dev'))).toBe('Fetching')
    expect(verbOf(shapeOfLine('TodoWrite'))).toBe('Planning')
  })

  it('still has a word for a tool it does not know', () => {
    expect(verbOf(shapeOfLine('SomethingNew'))).toBe('Working')
  })
})

describe('targetOf: what the work is being done to', () => {
  it('names a file, echoes a command, shows a pattern', () => {
    expect(targetOf(shapeOfLine('Read src/deep/a.ts'))).toBe('a.ts')
    expect(targetOf(shapeOfLine('Bash npm test'))).toBe('npm test')
    expect(targetOf(shapeOfLine('Grep case .assistant'))).toBe('case .assistant')
  })
})
