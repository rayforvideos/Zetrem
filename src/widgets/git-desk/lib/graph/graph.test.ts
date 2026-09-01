import { describe, expect, it } from 'vitest'
import { laneRows } from './graph'

type Bone = { sha: string; parents: string[] }

function rowsOf(bones: Bone[]) {
  return laneRows(bones)
}

describe('laneRows: a straight line stays in one lane', () => {
  it('keeps a linear history in lane zero', () => {
    const rows = rowsOf([
      { sha: 'c', parents: ['b'] },
      { sha: 'b', parents: ['a'] },
      { sha: 'a', parents: [] },
    ])
    expect(rows.map((row) => row.lane)).toEqual([0, 0, 0])
    expect(rows.map((row) => row.throughs)).toEqual([[], [], []])
  })
})

describe('laneRows: a branch opens a second lane and closes it at the fork', () => {
  // d(main) and c(feature) both sit on b: the graph forks below d.
  const BONES: Bone[] = [
    { sha: 'd', parents: ['b'] },
    { sha: 'c', parents: ['b'] },
    { sha: 'b', parents: ['a'] },
    { sha: 'a', parents: [] },
  ]

  it('gives the side branch its own lane', () => {
    const rows = rowsOf(BONES)
    expect(rows.map((row) => row.lane)).toEqual([0, 1, 0, 0])
  })

  it('lets lane zero pass straight through the side commit row', () => {
    const rows = rowsOf(BONES)
    expect(rows[1]?.throughs).toEqual([0])
  })

  it('folds the side lane into the fork commit', () => {
    const rows = rowsOf(BONES)
    expect(rows[2]?.tops).toEqual([1])
  })
})

describe('laneRows: a merge commit reaches out to its second parent', () => {
  // m merges c into d's line: m -> [d, c], both on a.
  const BONES: Bone[] = [
    { sha: 'm', parents: ['d', 'c'] },
    { sha: 'd', parents: ['a'] },
    { sha: 'c', parents: ['a'] },
    { sha: 'a', parents: [] },
  ]

  it('opens a lane for the second parent below the merge', () => {
    const rows = rowsOf(BONES)
    expect(rows[0]?.lane).toBe(0)
    expect(rows[0]?.bottoms).toEqual([1])
  })

  it('lands the second parent in the lane the merge opened', () => {
    const rows = rowsOf(BONES)
    expect(rows[2]?.lane).toBe(1)
  })

  it('joins both lines at the shared root', () => {
    const rows = rowsOf(BONES)
    expect(rows[3]?.lane).toBe(0)
    expect(rows[3]?.tops).toEqual([1])
  })

  it('measures the width the drawing needs', () => {
    expect(rowsOf(BONES).every((row) => row.width === 2)).toBe(true)
  })
})

describe('laneRows: a freed lane is reused by the next new line', () => {
  it('does not grow width past what is live at once', () => {
    // Two independent roots, one after the other: second line can take lane 1
    // only while the first still runs; a third line after both closed reuses.
    const rows = rowsOf([
      { sha: 'b2', parents: ['a2'] },
      { sha: 'b1', parents: ['a1'] },
      { sha: 'a1', parents: [] },
      { sha: 'a2', parents: [] },
    ])
    expect(rows.map((row) => row.lane)).toEqual([0, 1, 1, 0])
  })
})

describe('laneRows: whether the dot connects upward and downward', () => {
  it('marks a root with no line below and a tip with no line above', () => {
    const rows = rowsOf([
      { sha: 'b', parents: ['a'] },
      { sha: 'a', parents: [] },
    ])
    expect(rows.map((row) => [row.up, row.down])).toEqual([
      [false, true],
      [true, false],
    ])
  })
})
