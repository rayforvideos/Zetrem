import { describe, expect, it } from 'vitest'
import { projectKey } from './project-key'

describe('projectKey: one folder, one drawer', () => {
  it('gives the same folder the same key every time', () => {
    expect(projectKey('/Users/someone/work/zetrem')).toBe(projectKey('/Users/someone/work/zetrem'))
  })

  it('gives two folders two keys, or one project would read the other', () => {
    expect(projectKey('/Users/someone/work/zetrem')).not.toBe(
      projectKey('/Users/someone/work/other'),
    )
  })

  it('reads a folder named with a trailing separator as the same folder', () => {
    expect(projectKey('/Users/someone/work/zetrem/')).toBe(projectKey('/Users/someone/work/zetrem'))
  })

  it('is a name every filesystem accepts, whatever the path had in it', () => {
    expect(projectKey('/Users/someone/a folder/a:b*c/../zetrem')).toMatch(/^[0-9a-f]{32}$/)
  })

  it('stays short enough to sit under a path limit', () => {
    expect(projectKey(`/${'deep/'.repeat(60)}end`)).toHaveLength(32)
  })
})
