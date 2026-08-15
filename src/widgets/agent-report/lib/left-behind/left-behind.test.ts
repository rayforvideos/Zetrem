import { describe, expect, it } from 'vitest'
import { leftBehind } from './left-behind'

describe('leftBehind: what a teammate left in their own copy', () => {
  it('names the commits and the branch they sit on', () => {
    expect(leftBehind({ branch: 'worktree-agent-a87', commits: 3, dirtyFiles: 0 })).toBe(
      'Left 3 commits on worktree-agent-a87',
    )
  })

  it('counts a single commit in the singular', () => {
    expect(leftBehind({ branch: 'b', commits: 1, dirtyFiles: 0 })).toBe('Left 1 commit on b')
  })

  it('says what was left uncommitted, since that is the part you would lose', () => {
    expect(leftBehind({ branch: 'b', commits: 2, dirtyFiles: 1 })).toBe(
      'Left 2 commits and 1 file not committed on b',
    )
  })

  it('reports uncommitted work on its own when nothing was committed', () => {
    expect(leftBehind({ branch: 'b', commits: 0, dirtyFiles: 4 })).toBe(
      'Left 4 files not committed on b',
    )
  })

  it('says plainly that a copy nobody changed holds nothing', () => {
    expect(leftBehind({ branch: 'b', commits: 0, dirtyFiles: 0 })).toBe('Left nothing on b')
  })
})
