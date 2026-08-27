import { describe, expect, it } from 'vitest'
import { summaryOf, titleFrom } from './summary'

describe('the summary is the first paragraph, said plainly', () => {
  it('takes the first paragraph and flattens its lines', () => {
    expect(summaryOf('One line.\nStill the same paragraph.\n\nNext.')).toBe(
      'One line. Still the same paragraph.',
    )
  })

  it('skips a leading heading and reads the paragraph under it', () => {
    expect(summaryOf('# 결론\n\nZetrem은 팀원을 넘긴다.\n\n더')).toBe('Zetrem은 팀원을 넘긴다.')
  })

  it('strips inline markdown so the list reads as prose', () => {
    expect(summaryOf('**Bold** and `code` and [a link](http://x) and [[Note|alias]].')).toBe(
      'Bold and code and a link and alias.',
    )
  })

  it('cuts at the limit on a word', () => {
    const long = `${'word '.repeat(60)}end`
    const cut = summaryOf(long)
    expect(cut.length).toBeLessThanOrEqual(200)
    expect(cut.endsWith('…')).toBe(true)
  })

  it('is empty for an empty body', () => {
    expect(summaryOf('')).toBe('')
    expect(summaryOf('# Only a heading')).toBe('')
  })
})

describe('a filed answer gets a title from its own words', () => {
  it('prefers the first heading', () => {
    expect(titleFrom('Intro\n\n## What we found\n\nMore')).toBe('What we found')
  })

  it('takes the first sentence when there is no heading', () => {
    expect(titleFrom('The probe runs empty-handed. Then the rest.')).toBe(
      'The probe runs empty-handed',
    )
  })

  it('keeps a Korean sentence whole up to its ending mark', () => {
    expect(titleFrom('프로브는 빈손으로 돈다. 그 다음이 본문.')).toBe('프로브는 빈손으로 돈다')
  })

  it('shortens a long first line and strips characters a file name cannot hold', () => {
    const title = titleFrom(`A/very:long*title? ${'x'.repeat(200)}`)
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title).not.toMatch(/[/\\:*?"<>|]/)
  })

  it('falls back when there are no words', () => {
    expect(titleFrom('   \n```\ncode\n```')).toBe('Untitled')
  })
})
