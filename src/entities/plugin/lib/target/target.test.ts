import { describe, expect, it } from 'vitest'
import { safeTarget } from './target'

describe('safeTarget: whether a name is safe to put on a command', () => {
  it('lets a plugin id and a marketplace source through', () => {
    expect(safeTarget('humanize-korean@im-not-ai')).toBe('humanize-korean@im-not-ai')
    expect(safeTarget('epoko77-ai/im-not-ai')).toBe('epoko77-ai/im-not-ai')
    expect(safeTarget('https://github.com/anthropics/claude-plugins-official')).toBe(
      'https://github.com/anthropics/claude-plugins-official',
    )
    expect(safeTarget('/Users/sam/work/my-marketplace')).toBe('/Users/sam/work/my-marketplace')
  })

  it('trims the space around it', () => {
    expect(safeTarget('  nx  ')).toBe('nx')
  })

  it('refuses anything starting with a dash, which is a flag and not a name', () => {
    expect(safeTarget('--force')).toBe(null)
    expect(safeTarget('-rf')).toBe(null)
  })

  it('refuses a space in the middle, which would make it two arguments', () => {
    expect(safeTarget('nx --global')).toBe(null)
  })

  it('refuses what is empty or not a string', () => {
    expect(safeTarget('')).toBe(null)
    expect(safeTarget('   ')).toBe(null)
    expect(safeTarget(null)).toBe(null)
    expect(safeTarget(7)).toBe(null)
  })
})
