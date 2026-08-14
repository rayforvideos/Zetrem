import { describe, expect, it } from 'vitest'
import type { Turn } from '@/entities/conversation'
import { doingOf, elapsedLabel, tokenLabel } from './working'

function turn(overrides: Partial<Turn> = {}): Turn {
  return {
    role: 'assistant',
    text: '',
    tools: [],
    draft: '',
    thinking: '',
    startedAtMs: 0,
    ...overrides,
  }
}

describe('기다리는 동안 무엇을 하고 있는지 말한다', () => {
  it('차례가 아직 없으면 시작하는 중이다', () => {
    expect(doingOf(null)).toBe('Starting')
  })

  it('아직 결과가 없는 도구가 지금 하는 일이다', () => {
    const running = turn({
      tools: [{ line: 'Bash npm test', toolUseId: 't', input: { command: 'npm test' }, result: null }],
    })
    expect(doingOf(running)).toBe('Running')
  })

  it('도구가 끝났으면 그 도구를 지금 하는 일로 치지 않는다', () => {
    const done = turn({
      thinking: '음',
      tools: [
        {
          line: 'Read a.ts',
          toolUseId: 't',
          input: { file_path: 'a.ts' },
          result: { stdout: 'x', stderr: '', isError: false, interrupted: false },
        },
      ],
    })
    expect(doingOf(done)).toBe('Thinking')
  })

  it('말이 흐르고 있으면 쓰는 중이다', () => {
    expect(doingOf(turn({ draft: '반쯤 쓴' }))).toBe('Writing')
  })

  it('도구 종류가 하는 일의 이름을 정한다', () => {
    expect(doingOf(turn({ tools: [{ line: 'Read a.ts', toolUseId: 't', input: { file_path: 'a.ts' }, result: null }] }))).toBe('Reading')
    expect(doingOf(turn({ tools: [{ line: 'Grep foo', toolUseId: 't', input: { pattern: 'foo' }, result: null }] }))).toBe('Searching')
  })
})

describe('숫자는 읽을 수 있는 말로 선다', () => {
  it('분을 넘기면 분과 초로 쪼갠다', () => {
    expect(elapsedLabel(3000)).toBe('3s')
    expect(elapsedLabel(75_000)).toBe('1m 15s')
  })

  it('토큰이 없으면 아무 말도 하지 않는다 — 0 을 그리지 않는다', () => {
    expect(tokenLabel(0)).toBe('')
    expect(tokenLabel(-5)).toBe('')
  })

  it('천 단위는 k 로 줄인다', () => {
    expect(tokenLabel(240)).toBe('240 out')
    expect(tokenLabel(1240)).toBe('1.2k out')
  })
})
