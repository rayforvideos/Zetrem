import { describe, expect, it } from 'vitest'
import { branchOf, copyNameOf, outcomeOf } from './worktree'

describe('naming the copy a teammate works in', () => {
  it('names the directory the way the CLI does', () => {
    expect(copyNameOf('a874d6c44c2783ea8')).toBe('agent-a874d6c44c2783ea8')
  })

  it('names the branch the way the CLI does', () => {
    expect(branchOf('a874d6c44c2783ea8')).toBe('worktree-agent-a874d6c44c2783ea8')
  })
})

describe('outcomeOf: what git said about the copy', () => {
  it('reads the commit count and the uncommitted files', () => {
    expect(outcomeOf('1\n', ' M a.txt\n?? b.txt\n')).toEqual({ commits: 1, dirtyFiles: 2 })
  })

  it('reads a copy nobody touched as nothing at all', () => {
    expect(outcomeOf('0\n', '')).toEqual({ commits: 0, dirtyFiles: 0 })
  })

  it('does not count the blank line git leaves at the end', () => {
    expect(outcomeOf('2', ' M a.txt\n').dirtyFiles).toBe(1)
  })

  it('reads a count it cannot make sense of as none, rather than as NaN', () => {
    expect(outcomeOf('fatal: bad revision', '').commits).toBe(0)
  })
})
