import { describe, expect, it } from 'vitest'
import {
  askTrouble,
  emptyDiffNote,
  rollbackDone,
  rollbackTitle,
  rollbackWarning,
  troubleLine,
} from './review'

describe('what the confirm says before anything is taken back', () => {
  it('tells the unmerged case that nothing survives it', () => {
    const said = `${rollbackTitle('branch')} ${rollbackWarning('branch')}`
    expect(said).toContain('branch')
    expect(rollbackWarning('branch')).not.toEqual(rollbackWarning('merged'))
  })

  it('tells the merged case that a new commit undoes it instead', () => {
    expect(rollbackWarning('merged')).toContain('commit')
    expect(rollbackTitle('merged')).not.toEqual(rollbackTitle('branch'))
  })

  it('says afterwards which of the two happened', () => {
    expect(rollbackDone('dropped')).not.toEqual(rollbackDone('reverted'))
    for (const state of ['dropped', 'reverted'] as const) {
      expect(rollbackDone(state).length).toBeGreaterThan(0)
    }
  })
})

describe('what the report says when there is nothing to show', () => {
  it('says a run that changed nothing changed nothing', () => {
    expect(emptyDiffNote().length).toBeGreaterThan(0)
  })

  it('hands git its own words on, rather than a guess at what went wrong', () => {
    expect(troubleLine({ code: 'cli', said: 'fatal: bad revision' })).toContain(
      'fatal: bad revision',
    )
  })

  it('names the branch it looked for when nothing of the work is left', () => {
    expect(troubleLine({ code: 'failed', said: 'worktree-agent-abc123' })).toContain(
      'worktree-agent-abc123',
    )
  })

  it('does not blame git for a question that never reached it', () => {
    expect(askTrouble().length).toBeGreaterThan(0)
  })

  it('says plainly that an id it will not act on is one it will not act on', () => {
    const said = troubleLine({ code: 'refused', said: 'agent-id' })
    expect(said.length).toBeGreaterThan(0)
    expect(said).not.toContain('agent-id')
  })
})
