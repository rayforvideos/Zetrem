import { describe, expect, it } from 'vitest'
import { lineDiff } from './diff'

describe('lineDiff — Edit 의 두 덩어리를 눈으로 비교한다', () => {
  it('바뀐 줄만 +/- 로 가른다', () => {
    expect(lineDiff('a\nb\nc', 'a\nB\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('추가만 있으면 + 만 난다', () => {
    expect(lineDiff('a', 'a\nb')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'add', text: 'b' },
    ])
  })

  it('삭제만 있으면 - 만 난다', () => {
    expect(lineDiff('a\nb', 'a')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
    ])
  })

  it('같은 줄이 길게 이어지면 문맥만 남긴다 — 읽을 것은 바뀐 자리다', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x'].join('\n')
    const after = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'y'].join('\n')
    const diff = lineDiff(before, after, 2)
    expect(diff.filter((line) => line.kind === 'same').length).toBeLessThanOrEqual(4)
    expect(diff.some((line) => line.text === '…')).toBe(true)
    expect(diff.some((line) => line.kind === 'remove' && line.text === 'x')).toBe(true)
  })

  it('빈 문자열끼리는 아무 줄도 내지 않는다', () => {
    expect(lineDiff('', '')).toEqual([])
  })

  it('첫 줄(0번)이 바뀌면 앞에 남길 문맥이 없다', () => {
    expect(lineDiff('a\nb\nc', 'A\nb\nc')).toEqual([
      { kind: 'remove', text: 'a' },
      { kind: 'add', text: 'A' },
      { kind: 'same', text: 'b' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('길이가 다른 두 입력에서 마지막 줄이 바뀌면 뒤에 남길 문맥이 없다', () => {
    expect(lineDiff('a\nb', 'a\nb\nC')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'same', text: 'b' },
      { kind: 'add', text: 'C' },
    ])
  })

  it('한쪽만 비어 있으면 반대쪽 전체가 +/- 로 난다', () => {
    expect(lineDiff('', 'a\nb')).toEqual([
      { kind: 'add', text: 'a' },
      { kind: 'add', text: 'b' },
    ])
    expect(lineDiff('a\nb', '')).toEqual([
      { kind: 'remove', text: 'a' },
      { kind: 'remove', text: 'b' },
    ])
  })
})
