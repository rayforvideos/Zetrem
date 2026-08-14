import { describe, expect, it } from 'vitest'
import { resultNote, toolShape } from './tool-shape'

describe('toolShape — 도구를 제 모양으로 읽는다', () => {
  it('파일을 읽고 쓰는 도구는 경로를 디렉터리와 이름으로 가른다', () => {
    expect(toolShape('Read', { file_path: 'src/entities/agent-session/api/claude/status.ts' })).toEqual({
      kind: 'file',
      verb: 'read',
      dir: 'src/entities/agent-session/api/claude/',
      name: 'status.ts',
    })
    expect(toolShape('Write', { file_path: 'a.ts' })).toMatchObject({ verb: 'write', dir: '', name: 'a.ts' })
    expect(toolShape('Edit', { file_path: 'a.ts' })).toMatchObject({ verb: 'edit' })
    expect(toolShape('MultiEdit', { file_path: 'a.ts' })).toMatchObject({ verb: 'edit' })
  })

  it('명령은 명령으로 읽는다', () => {
    expect(toolShape('Bash', { command: 'npm test -- status' })).toEqual({
      kind: 'command',
      command: 'npm test -- status',
    })
  })

  it('찾는 도구는 패턴과 범위를 가른다', () => {
    expect(toolShape('Grep', { pattern: 'childOpen', path: 'src' })).toEqual({
      kind: 'search',
      pattern: 'childOpen',
      scope: 'src',
    })
    expect(toolShape('Glob', { pattern: '**/*.tsx' })).toMatchObject({ kind: 'search', scope: '' })
  })

  it('웹은 주소에서 도메인만 남긴다 — 전체 URL 은 줄을 잡아먹는다', () => {
    expect(toolShape('WebFetch', { url: 'https://registry.npmjs.org/@anthropic-ai/claude-code/latest' })).toEqual({
      kind: 'web',
      label: 'registry.npmjs.org',
    })
    expect(toolShape('WebSearch', { query: 'electron transparent window flash' })).toEqual({
      kind: 'web',
      label: 'electron transparent window flash',
    })
  })

  it('망가진 주소는 있는 그대로 둔다 — 파싱에 실패했다고 빈 줄을 내지 않는다', () => {
    expect(toolShape('WebFetch', { url: 'not a url' })).toEqual({ kind: 'web', label: 'not a url' })
  })

  it('서브에이전트는 역할과 받은 일감을 가른다', () => {
    expect(toolShape('Agent', { subagent_type: 'code-reviewer', description: '리뷰' })).toEqual({
      kind: 'agent',
      subagentType: 'code-reviewer',
      description: '리뷰',
    })
    expect(toolShape('Task', { subagent_type: 'Explore' })).toMatchObject({ kind: 'agent' })
  })

  it('할 일 목록은 제 모양이 따로 있다', () => {
    expect(toolShape('TodoWrite', { todos: [] })).toEqual({ kind: 'todo' })
  })

  it('모르는 도구는 이름만 남긴다 — 지어내지 않는다', () => {
    expect(toolShape('ScheduleWakeup', { delaySeconds: 60 })).toEqual({
      kind: 'plain',
      name: 'ScheduleWakeup',
    })
  })

  it('입력이 기대한 모양이 아니면 평범한 줄로 물러난다', () => {
    expect(toolShape('Read', null)).toEqual({ kind: 'plain', name: 'Read' })
    expect(toolShape('Bash', { command: 123 })).toEqual({ kind: 'plain', name: 'Bash' })
  })
})

describe('resultNote — 결과에서 한 조각만 꺼낸다', () => {
  it('읽은 파일은 줄 수를 센다', () => {
    const note = resultNote({ kind: 'file', verb: 'read', dir: '', name: 'a.ts' }, '1\n2\n3')
    expect(note).toBe('3줄')
  })

  it('찾은 것은 적중 수를 센다', () => {
    const note = resultNote({ kind: 'search', pattern: 'x', scope: '' }, 'a.ts:1\nb.ts:2')
    expect(note).toBe('2곳')
  })

  it('아무것도 못 찾으면 그렇게 말한다 — 빈 칸으로 두면 실패인지 성공인지 모른다', () => {
    expect(resultNote({ kind: 'search', pattern: 'x', scope: '' }, '')).toBe('없음')
  })

  it('셀 것이 없는 모양에는 아무 말도 붙이지 않는다', () => {
    expect(resultNote({ kind: 'command', command: 'ls' }, 'a\nb')).toBeNull()
    expect(resultNote({ kind: 'file', verb: 'read', dir: '', name: 'a.ts' }, null)).toBeNull()
  })
})
