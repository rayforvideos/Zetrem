import { describe, expect, it } from 'vitest'
import { linked, noteTitleOf } from './wikilinks'

const titles = new Set(['정산-규칙', 'API 비교', 'draft (v2'])

describe('wikilinks', () => {
  it('links a name the vault has', () => {
    expect(linked('see [[정산-규칙]] now', titles)).toBe(
      'see [정산-규칙](#vault/%EC%A0%95%EC%82%B0-%EA%B7%9C%EC%B9%99) now',
    )
  })

  it('shows the alias when one is given', () => {
    expect(linked('[[API 비교|비교표]]', titles)).toBe('[비교표](#vault/API%20%EB%B9%84%EA%B5%90)')
  })

  it('hides the parentheses a markdown link would end on', () => {
    expect(linked('[[draft (v2]]', titles)).toBe('[draft (v2](#vault/draft%20%28v2)')
    expect(noteTitleOf('#vault/draft%20%28v2')).toBe('draft (v2')
  })

  it('drops the brackets from a name the vault does not have', () => {
    expect(linked('[[없는 노트]]', titles)).toBe('없는 노트')
  })

  it('leaves code alone', () => {
    expect(linked('`[[정산-규칙]]`', titles)).toBe('`[[정산-규칙]]`')
    expect(linked('```\n[[정산-규칙]]\n```', titles)).toBe('```\n[[정산-규칙]]\n```')
  })

  it('reads the title back out of a link', () => {
    expect(noteTitleOf('#vault/%EC%A0%95%EC%82%B0-%EA%B7%9C%EC%B9%99')).toBe('정산-규칙')
    expect(noteTitleOf('https://example.com')).toBeNull()
  })
})
