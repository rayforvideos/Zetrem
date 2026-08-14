import { describe, expect, it } from 'vitest'
import { shapeOfLine } from '../tool-line/tool-line'
import { targetOf, verbOf } from './tool-verb'

describe('verbOf — 무엇을 하는 중인지 한 낱말로', () => {
  it('도구마다 제 동사를 쓴다', () => {
    expect(verbOf(shapeOfLine('Read src/a.ts'))).toBe('Reading')
    expect(verbOf(shapeOfLine('Edit src/a.ts'))).toBe('Editing')
    expect(verbOf(shapeOfLine('Write src/a.ts'))).toBe('Writing')
    expect(verbOf(shapeOfLine('Bash npm test'))).toBe('Running')
    expect(verbOf(shapeOfLine('Grep case'))).toBe('Searching')
    expect(verbOf(shapeOfLine('WebFetch https://x.dev'))).toBe('Fetching')
    expect(verbOf(shapeOfLine('TodoWrite'))).toBe('Planning')
  })

  it('모르는 도구도 말을 잃지 않는다', () => {
    expect(verbOf(shapeOfLine('SomethingNew'))).toBe('Working')
  })
})

describe('targetOf — 무엇을 상대로 하는지', () => {
  it('파일은 이름만, 명령은 명령줄, 검색은 무늬', () => {
    expect(targetOf(shapeOfLine('Read src/deep/a.ts'))).toBe('a.ts')
    expect(targetOf(shapeOfLine('Bash npm test'))).toBe('npm test')
    expect(targetOf(shapeOfLine('Grep case .assistant'))).toBe('case .assistant')
  })
})
