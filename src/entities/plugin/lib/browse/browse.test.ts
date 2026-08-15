import { describe, expect, it } from 'vitest'
import type { AvailablePlugin } from '../catalog/catalog.types'
import { browsable } from './browse'

function plugin(name: string, installCount: number | null, description = ''): AvailablePlugin {
  return { id: `${name}@m`, name, marketplace: 'm', description, installCount }
}

describe('browsable: what the browse tab shows before you have typed anything', () => {
  it('shows the whole catalogue, most reached for first', () => {
    const list = browsable([plugin('a', 10), plugin('b', 300), plugin('c', 50)], new Set(), '')
    expect(list.map((one) => one.name)).toEqual(['b', 'c', 'a'])
  })

  it('settles a tie by name, so the order never jumps about', () => {
    const list = browsable([plugin('zed', 5), plugin('amp', 5)], new Set(), '')
    expect(list.map((one) => one.name)).toEqual(['amp', 'zed'])
  })

  it('puts a plugin nobody has counted at the back rather than dropping it', () => {
    const list = browsable([plugin('known', 1), plugin('uncounted', null)], new Set(), '')
    expect(list.map((one) => one.name)).toEqual(['known', 'uncounted'])
  })

  it('leaves out what you already have', () => {
    const list = browsable([plugin('a', 1), plugin('b', 2)], new Set(['a@m']), '')
    expect(list.map((one) => one.name)).toEqual(['b'])
  })

  it('searches the name and what it says it does', () => {
    const pool = [plugin('alpha', 1, 'reads swift'), plugin('beta', 2, 'writes rust')]
    expect(browsable(pool, new Set(), 'swift').map((one) => one.name)).toEqual(['alpha'])
    expect(browsable(pool, new Set(), 'RUST').map((one) => one.name)).toEqual(['beta'])
  })

  it('finds nothing for a search that matches nothing', () => {
    expect(browsable([plugin('a', 1)], new Set(), 'zzz')).toEqual([])
  })

  it('does not reorder the catalogue it was handed', () => {
    const pool = [plugin('a', 1), plugin('b', 2)]
    browsable(pool, new Set(), '')
    expect(pool.map((one) => one.name)).toEqual(['a', 'b'])
  })
})
