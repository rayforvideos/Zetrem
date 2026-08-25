import { describe, expect, it } from 'vitest'
import { descendantsOf, parsePsRows } from './process-tree'

describe('parsePsRows', () => {
  it('pulls the pid and parent pid out of ps output', () => {
    const rows = parsePsRows(['  PID  PPID', '  100     1', '  205   100', ' 3010   205'].join('\n'))
    expect(rows).toEqual([
      { pid: 100, ppid: 1 },
      { pid: 205, ppid: 100 },
      { pid: 3010, ppid: 205 },
    ])
  })

  it('drops a line that is not two numbers', () => {
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

  it('follows down to grandchildren, because subagents are ours too', () => {
    expect(descendantsOf(rows, 205)).toEqual(new Set([205, 300, 400]))
  })

  it('leaves another branch alone', () => {
    expect(descendantsOf(rows, 205).has(500)).toBe(false)
  })

  it('stops on a cycle, because ps can report one mid-race', () => {
    const cyclic = [
      { pid: 1, ppid: 2 },
      { pid: 2, ppid: 1 },
    ]
    expect(() => descendantsOf(cyclic, 1)).not.toThrow()
  })

  it('returns only itself when it has no children', () => {
    expect(descendantsOf(rows, 9999)).toEqual(new Set([9999]))
  })
})
