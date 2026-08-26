import { describe, expect, it } from 'vitest'
import type { InstalledPlugin, PluginScope } from '../../api/catalog/catalog.types'
import { groupsOf } from './groups'

function plugin(name: string, scope: PluginScope): InstalledPlugin {
  return {
    id: `${name}@m`,
    name,
    marketplace: 'm',
    version: '1.0.0',
    scope,
    projectPath: null,
    enabled: true,
  }
}

describe('groupsOf: who a plugin belongs to is a heading, not a suffix on every row', () => {
  it('keeps the order yours, this project, your organisation', () => {
    const groups = groupsOf([plugin('c', 'managed'), plugin('b', 'project'), plugin('a', 'user')])
    expect(groups.map((group) => group.key)).toEqual(['yours', 'project', 'organisation'])
  })

  it('leaves out a group nobody is in', () => {
    const groups = groupsOf([plugin('a', 'user'), plugin('b', 'user')])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.plugins).toHaveLength(2)
  })

  it('says nothing when everything is yours, because there is nothing to tell apart', () => {
    const groups = groupsOf([plugin('a', 'user')])
    expect(groups[0]?.titled).toBe(false)
  })

  it('names the groups as soon as there is more than one', () => {
    const groups = groupsOf([plugin('a', 'user'), plugin('b', 'managed')])
    expect(groups.every((group) => group.titled)).toBe(true)
  })

  it('names a lone group that is not yours, since that is the thing worth saying', () => {
    const groups = groupsOf([plugin('a', 'managed')])
    expect(groups[0]?.titled).toBe(true)
    expect(groups[0]?.title.message).toBe('Your organisation')
  })

  it('files a scope it does not know with your own, rather than dropping it', () => {
    const groups = groupsOf([plugin('a', 'unknown')])
    expect(groups[0]?.key).toBe('yours')
  })

  it('has nothing to show for an empty shelf', () => {
    expect(groupsOf([])).toEqual([])
  })
})

describe('a group that takes controls away says why', () => {
  it('explains what an organisation plugin cannot do, where the missing buttons are', () => {
    const [group] = groupsOf([plugin('a', 'managed')])
    expect(group?.note?.message).toContain('cannot be removed or turned off')
  })

  it('explains who else a project plugin belongs to', () => {
    const [group] = groupsOf([plugin('a', 'project')])
    expect(group?.note?.message).toContain('this folder')
  })

  it('has nothing to explain about your own', () => {
    const [group] = groupsOf([plugin('a', 'user')])
    expect(group?.note).toBeNull()
  })
})
