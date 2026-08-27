import { describe, expect, it } from 'vitest'
import { noteParts } from './note-parts'

describe('the first lines of a note, read as what they are', () => {
  it('takes the first plain line as the conclusion and the short second as the project', () => {
    const got = noteParts('배송 API는 B를 쓴다\nforceteller-cs\n\n## 근거\n둘을 재봤다')
    expect(got.conclusion).toBe('배송 API는 B를 쓴다')
    expect(got.project).toBe('forceteller-cs')
    expect(got.body).toBe('## 근거\n둘을 재봤다')
  })

  it('reads past the blank lines a writer leaves at the top', () => {
    const got = noteParts('\n\n  결론이다  \n\n  프로젝트  \n\n본문')
    expect(got.conclusion).toBe('결론이다')
    expect(got.project).toBe('프로젝트')
    expect(got.body).toBe('본문')
  })

  it('leaves the second line in the body when it reads as a sentence', () => {
    const got = noteParts('결론이다\n이건 두 번째 문장이다.\n본문')
    expect(got.conclusion).toBe('결론이다')
    expect(got.project).toBeNull()
    expect(got.body).toBe('이건 두 번째 문장이다.\n본문')
  })

  it('leaves a long second line alone, since a project name is short', () => {
    const long = 'x'.repeat(61)
    const got = noteParts(`결론이다\n${long}`)
    expect(got.project).toBeNull()
    expect(got.body).toBe(long)
  })

  it('takes nothing from a note that opens with a heading, a list or a fence', () => {
    for (const opener of ['# 제목', '- 항목', '```ts', '1. 항목']) {
      const text = `${opener}\n두 번째\n본문`
      expect(noteParts(text)).toEqual({ conclusion: null, project: null, body: text })
    }
  })

  it('answers an empty note with an empty body and nothing read out of it', () => {
    expect(noteParts('   \n\n')).toEqual({ conclusion: null, project: null, body: '   \n\n' })
  })

  it('keeps the conclusion when the note has nothing after it', () => {
    const got = noteParts('결론이다\n')
    expect(got.conclusion).toBe('결론이다')
    expect(got.project).toBeNull()
    expect(got.body).toBe('')
  })
})
