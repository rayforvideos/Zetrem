import { describe, expect, it } from 'vitest'
import { descendantsOf, parsePsRows, runningSessionIds } from './process-tree'

describe('parsePsRows', () => {
  it('ps 출력에서 pid 와 부모 pid 를 뽑는다', () => {
    const rows = parsePsRows(['  PID  PPID', '  100     1', '  205   100', ' 3010   205'].join('\n'))
    expect(rows).toEqual([
      { pid: 100, ppid: 1 },
      { pid: 205, ppid: 100 },
      { pid: 3010, ppid: 205 },
    ])
  })

  it('숫자가 아닌 줄은 버린다', () => {
    expect(parsePsRows('PID PPID\nnonsense\n')).toEqual([])
  })
})

describe('descendantsOf', () => {
  const rows = [
    { pid: 100, ppid: 1 },
    { pid: 205, ppid: 1 },
    { pid: 300, ppid: 205 },
    { pid: 400, ppid: 300 },
    { pid: 500, ppid: 100 },
  ]

  it('손자까지 따라 내려간다 — 서브에이전트도 우리 것이다', () => {
    expect(descendantsOf(rows, 205)).toEqual(new Set([205, 300, 400]))
  })

  it('남의 가지는 포함하지 않는다', () => {
    expect(descendantsOf(rows, 205).has(500)).toBe(false)
  })

  it('고리가 있어도 멈춘다 — ps 는 경합 중에 이상한 걸 낼 수 있다', () => {
    const cyclic = [
      { pid: 1, ppid: 2 },
      { pid: 2, ppid: 1 },
    ]
    expect(() => descendantsOf(cyclic, 1)).not.toThrow()
  })

  it('뿌리가 없으면 자기 자신뿐이다', () => {
    expect(descendantsOf(rows, 9999)).toEqual(new Set([9999]))
  })
})

describe('runningSessionIds', () => {
  const ps = [
    '  PID COMMAND',
    ' 2201 claude -p --session-id 11111111-2222-3333-4444-555555555555 --model haiku 1+1?',
    ' 2202 /bin/zsh -l',
    ' 2203 claude --session-id AAAAAAAA-bbbb-cccc-dddd-eeeeeeeeeeee',
  ].join('\n')

  it('도는 프로세스의 세션 id 를 모은다 — 우리가 발급했으므로 명령줄에 그대로 있다', () => {
    expect(runningSessionIds(ps)).toEqual(
      new Set([
        '11111111-2222-3333-4444-555555555555',
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      ]),
    )
  })

  it('아무도 안 돌면 빈 집합이다', () => {
    expect(runningSessionIds('  PID COMMAND\n 1 /bin/zsh')).toEqual(new Set())
  })
})
