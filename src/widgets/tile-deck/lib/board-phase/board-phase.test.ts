import { describe, expect, it } from 'vitest'
import { MOTION } from '@/shared/config/motion/motion'
import {
  boardPhaseMs,
  boardPresence,
  nextBoardPhase,
  settledBoardPhase,
  showsBoard,
  tilesCanLeave,
  tilesLeaving,
  tilesStanding,
} from './board-phase'
import type { BoardPhase } from './board-phase.types'

describe('the deck taking the board', () => {
  it('leaves the tiles alone while the crew is small', () => {
    expect(nextBoardPhase('tiles', false)).toBe('tiles')
  })

  it('starts boarding the frame the crew outgrows tiles', () => {
    expect(nextBoardPhase('tiles', true)).toBe('boarding')
  })

  it('stays boarding while it boards, rather than restarting itself', () => {
    expect(nextBoardPhase('boarding', true)).toBe('boarding')
  })

  it('lands on the board when the boarding time is up', () => {
    expect(settledBoardPhase('boarding')).toBe('board')
  })

  it('gives boarding the fan’s time, so the terminal and the board move as one', () => {
    expect(boardPhaseMs('boarding')).toBe(MOTION.fanMs)
  })
})

describe('the deck giving the board back', () => {
  it('starts unboarding the frame the crew shrinks under the line', () => {
    expect(nextBoardPhase('board', false)).toBe('unboarding')
  })

  it('stays unboarding while it unboards', () => {
    expect(nextBoardPhase('unboarding', false)).toBe('unboarding')
  })

  it('lands back on tiles when the unboarding time is up', () => {
    expect(settledBoardPhase('unboarding')).toBe('tiles')
  })

  it('gives unboarding the merge’s time', () => {
    expect(boardPhaseMs('unboarding')).toBe(MOTION.mergeMs)
  })

  it('holds the board once it is up', () => {
    expect(nextBoardPhase('board', true)).toBe('board')
  })
})

describe('a crew that crosses back mid-flip', () => {
  it('turns a half-finished boarding around', () => {
    expect(nextBoardPhase('boarding', false)).toBe('unboarding')
  })

  it('turns a half-finished unboarding around', () => {
    expect(nextBoardPhase('unboarding', true)).toBe('boarding')
  })

  it('settles wherever the last crossing pointed, in three steps at most', () => {
    let phase: BoardPhase = 'board'
    phase = nextBoardPhase(phase, false)
    phase = nextBoardPhase(phase, true)
    expect(phase).toBe('boarding')
    expect(settledBoardPhase(phase)).toBe('board')
  })

  it('asks for no time at all once it is at rest', () => {
    expect(boardPhaseMs('tiles')).toBeNull()
    expect(boardPhaseMs('board')).toBeNull()
  })

  it('leaves a resting phase where it is', () => {
    expect(settledBoardPhase('tiles')).toBe('tiles')
    expect(settledBoardPhase('board')).toBe('board')
  })
})

describe('which layers the deck draws', () => {
  it('draws both layers through a flip, and one at rest', () => {
    expect([tilesStanding('tiles'), showsBoard('tiles')]).toEqual([true, false])
    expect([tilesLeaving('boarding'), showsBoard('boarding')]).toEqual([true, true])
    expect([tilesStanding('board'), tilesLeaving('board'), showsBoard('board')]).toEqual([
      false,
      false,
      true,
    ])
    expect([tilesStanding('unboarding'), showsBoard('unboarding')]).toEqual([true, true])
  })

  it('sends the board in on boarding and out on unboarding', () => {
    expect(boardPresence('boarding')).toBe('arriving')
    expect(boardPresence('unboarding')).toBe('leaving')
    expect(boardPresence('tiles')).toBeNull()
    expect(boardPresence('board')).toBeNull()
  })

  it('turns the tiles into a leaving snapshot only while boarding', () => {
    expect(tilesLeaving('boarding')).toBe(true)
    expect(tilesStanding('boarding')).toBe(false)
    expect(tilesLeaving('unboarding')).toBe(false)
    expect(tilesLeaving('tiles')).toBe(false)
  })

  it('lets a teammate leave as a tile only while tiles are the deck’s own layer', () => {
    expect(tilesCanLeave('tiles')).toBe(true)
    expect(tilesCanLeave('boarding')).toBe(false)
    expect(tilesCanLeave('board')).toBe(false)
    expect(tilesCanLeave('unboarding')).toBe(false)
  })
})
