import { describe, expect, it } from 'vitest'
import { shapeOfLine, tally } from './tool-line'

describe('shapeOfLine — 자식이 남긴 한 줄을 도구의 모양으로 되돌린다', () => {
  it('파일 줄은 폴더와 이름으로 갈라진다', () => {
    expect(shapeOfLine('Read src/entities/agent-session/index.ts')).toEqual({
      kind: 'file',
      verb: 'read',
      dir: 'src/entities/agent-session/',
      name: 'index.ts',
    })
  })

  it('고치는 줄과 읽는 줄을 구분한다 — 같은 파일이어도 한 일이 다르다', () => {
    expect(shapeOfLine('Edit a.ts')).toMatchObject({ kind: 'file', verb: 'edit' })
    expect(shapeOfLine('Write a.ts')).toMatchObject({ kind: 'file', verb: 'write' })
  })

  it('명령은 통째로 명령이다 — 첫 칸 뒤는 자르지 않는다', () => {
    expect(shapeOfLine('Bash npm test -- --run')).toEqual({
      kind: 'command',
      command: 'npm test -- --run',
    })
  })

  it('찾는 줄은 무엇을 찾는지 남긴다', () => {
    expect(shapeOfLine('Grep useEffect')).toMatchObject({ kind: 'search', pattern: 'useEffect' })
  })

  it('모르는 이름은 이름만 남는다 — 지어내지 않는다', () => {
    expect(shapeOfLine('SomeTool 뭔가')).toEqual({ kind: 'plain', name: 'SomeTool' })
  })

  it('대상이 없는 줄도 무너지지 않는다', () => {
    expect(shapeOfLine('Read')).toEqual({ kind: 'plain', name: 'Read' })
  })
})

describe('tally — 얼마나 일했나', () => {
  it('한 일을 종류별로 센다', () => {
    const counted = tally([
      'Read a.ts',
      'Read b.ts',
      'Edit b.ts',
      'Bash npm test',
      'Grep foo',
      'WebFetch https://x.test/a',
    ])
    expect(counted).toEqual({ read: 2, wrote: 1, ran: 1, searched: 2 })
  })

  it('아무것도 안 했으면 전부 0 이다', () => {
    expect(tally([])).toEqual({ read: 0, wrote: 0, ran: 0, searched: 0 })
  })
})
