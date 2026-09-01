import { describe, expect, it } from 'vitest'
import type { GitFile } from '@/entities/git/model/repo'
import { sideOf } from './side'

function file(over: Partial<GitFile>): GitFile {
  return { path: 'a.ts', staged: false, unstaged: false, sign: 'M', ...over }
}

describe('sideOf: which side of a change the diff should show', () => {
  it('shows the working tree side while anything is unstaged', () => {
    expect(sideOf(file({ staged: true, unstaged: true }))).toBe('unstaged')
    expect(sideOf(file({ unstaged: true }))).toBe('unstaged')
  })

  it('shows the staged side once everything is staged', () => {
    expect(sideOf(file({ staged: true }))).toBe('staged')
  })

  it('names a file git does not know yet', () => {
    expect(sideOf(file({ unstaged: true, sign: '?' }))).toBe('untracked')
  })
})
