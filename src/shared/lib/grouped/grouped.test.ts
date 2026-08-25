import { describe, expect, it } from 'vitest'
import { grouped } from './grouped'

type Item = { name: string; where: 'yours' | 'shared' | 'theirs' }

const ORDER = ['yours', 'shared', 'theirs'] as const
const whereOf = (item: Item) => item.where

function of(items: Item[]) {
  return grouped(ORDER, items, whereOf, 'yours')
}

describe('grouped', () => {
  it('keeps the order it was given, not the order the items arrived in', () => {
    const groups = of([
      { name: 'c', where: 'theirs' },
      { name: 'a', where: 'yours' },
      { name: 'b', where: 'shared' },
    ])
    expect(groups.map((group) => group.key)).toEqual(['yours', 'shared', 'theirs'])
  })

  it('leaves out a group nobody filled', () => {
    const groups = of([{ name: 'a', where: 'yours' }, { name: 'c', where: 'theirs' }])
    expect(groups.map((group) => group.key)).toEqual(['yours', 'theirs'])
  })

  it('keeps every member of a group, in the order they came', () => {
    const groups = of([
      { name: 'a', where: 'shared' },
      { name: 'b', where: 'shared' },
    ])
    expect(groups[0]?.members.map((item) => item.name)).toEqual(['a', 'b'])
  })

  it('does not head the plain group when it is the only one', () => {
    const groups = of([{ name: 'a', where: 'yours' }])
    expect(groups[0]?.titled).toBe(false)
  })

  it('heads every group once there is more than one', () => {
    const groups = of([{ name: 'a', where: 'yours' }, { name: 'b', where: 'shared' }])
    expect(groups.map((group) => group.titled)).toEqual([true, true])
  })

  it('heads a group that is not the plain one even when it stands alone', () => {
    const groups = of([{ name: 'b', where: 'shared' }])
    expect(groups[0]?.titled).toBe(true)
  })

  it('gives nothing back for nothing', () => {
    expect(of([])).toEqual([])
  })
})
