import { describe, expect, it } from 'vitest'
import type { LibraryProposal } from '../../model/proposal'
import { twinsOf, withoutTwins } from './twin-proposals'

function proposal(over: Partial<LibraryProposal>): LibraryProposal {
  return {
    id: 'a',
    folder: '',
    title: '팀원별 README.md 요약',
    body: '셋을 한 번에 불렀다.',
    tags: [],
    proposedAtMs: 1,
    session: '',
    by: '',
    ...over,
  }
}

describe('the same suggestion, made more than once, is one suggestion', () => {
  it('keeps the first of a group and drops the rest', () => {
    const all = [
      proposal({ id: 'a', proposedAtMs: 1 }),
      proposal({ id: 'b', proposedAtMs: 2 }),
      proposal({ id: 'c', proposedAtMs: 3 }),
    ]
    expect(withoutTwins(all).map((one) => one.id)).toEqual(['a'])
  })

  it('keeps suggestions that differ in title, body or folder', () => {
    const all = [
      proposal({ id: 'a' }),
      proposal({ id: 'b', title: '놀이터 규칙' }),
      proposal({ id: 'c', body: '다른 본문.' }),
      proposal({ id: 'd', folder: '회의' }),
    ]
    expect(withoutTwins(all).map((one) => one.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('leaves a list with nothing repeated exactly as it was', () => {
    const all = [proposal({ id: 'a' }), proposal({ id: 'b', title: '다른 제목' })]
    expect(withoutTwins(all)).toEqual(all)
  })

  it('names the others that say the same thing, and not the one asked about', () => {
    const all = [
      proposal({ id: 'a' }),
      proposal({ id: 'b' }),
      proposal({ id: 'c', title: '놀이터 규칙' }),
      proposal({ id: 'd' }),
    ]
    expect(twinsOf(all, 'a').map((one) => one.id)).toEqual(['b', 'd'])
    expect(twinsOf(all, 'c')).toEqual([])
  })

  it('has nothing to say about an id the list does not hold', () => {
    expect(twinsOf([proposal({ id: 'a' })], 'gone')).toEqual([])
  })
})
