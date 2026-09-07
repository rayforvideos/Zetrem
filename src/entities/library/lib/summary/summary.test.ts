import { describe, expect, it } from 'vitest'
import { bodyEchoesTitle, summaryOf, titleFrom } from './summary'

describe('the summary is the first paragraph, said plainly', () => {
  it('never ends a title in a period, since that file could not be named again', () => {
    expect(titleFrom('Ship it.\n\nmore')).toBe('Ship it')
    expect(titleFrom('Done...')).toBe('Done')
  })

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

  it('says a long title was cut instead of stopping mid-thought', () => {
    const title = titleFrom(
      'Zetrem Dev는 개발자들이 여러 도구와 기능을 시험해 볼 수 있는 개발 플랫폼이고, 이 프로젝트는 그 위에서 돈다.',
    )
    expect(title.endsWith('…')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(60)
  })

  it('ends a cut title on a word, with no half word before the mark', () => {
    const title = titleFrom(`${'word '.repeat(30)}end`)
    expect(title).toBe(`${'word '.repeat(10)}word…`)
  })

  it('cuts inside a run that has no space to cut on, and still marks it', () => {
    const title = titleFrom('x'.repeat(200))
    expect(title).toBe(`${'x'.repeat(59)}…`)
  })

  it('leaves no comma or space stranded before the mark', () => {
    const title = titleFrom(`${'word '.repeat(11)}tail, ${'x'.repeat(80)}`)
    expect(title.endsWith(', …')).toBe(false)
    expect(title.endsWith(' …')).toBe(false)
    expect(title.endsWith('…')).toBe(true)
  })

  it('keeps a short title whole, with no mark to explain', () => {
    expect(titleFrom('놀이터 규칙')).toBe('놀이터 규칙')
  })
})

describe('a note whose body is its own title is read once', () => {
  it('is an echo when the body says exactly what the title says', () => {
    expect(bodyEchoesTitle('놀이터 규칙', '놀이터 규칙')).toBe(true)
    expect(bodyEchoesTitle('Ship it', 'Ship it.')).toBe(true)
    expect(bodyEchoesTitle('Ship it', '**Ship it**')).toBe(true)
  })

  it('is not an echo when the body has anything more to say', () => {
    expect(bodyEchoesTitle('놀이터 규칙', '놀이터 규칙\n\n하나만 지킨다.')).toBe(false)
    expect(bodyEchoesTitle('Ship it', 'Ship it when the tests pass.')).toBe(false)
  })

  it('is not an echo when a cut title only opens the body', () => {
    const body = `${'word '.repeat(30)}end`
    expect(bodyEchoesTitle(titleFrom(body), body)).toBe(false)
  })

  it('is not an echo when there is no body at all', () => {
    expect(bodyEchoesTitle('New note', '')).toBe(false)
  })
})
