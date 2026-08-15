import { describe, expect, it } from 'vitest'
import { withScope } from './scope'

describe('withScope: the CLI needs to know which copy you meant', () => {
  it('names the scope so removing one copy does not leave the other behind', () => {
    expect(withScope(['plugin', 'uninstall', 'nx@m'], 'uninstall', 'project')).toEqual([
      'plugin',
      'uninstall',
      'nx@m',
      '--scope',
      'project',
    ])
  })

  it('will not offer to uninstall what an organisation put there', () => {
    expect(withScope(['plugin', 'uninstall', 'a@b'], 'uninstall', 'managed')).toEqual([
      'plugin',
      'uninstall',
      'a@b',
    ])
  })

  it('does let an organisation plugin be updated where it lives', () => {
    expect(withScope(['plugin', 'update', 'a@b'], 'update', 'managed')).toContain('managed')
  })

  it('leaves a verb that has no scope alone', () => {
    expect(withScope(['plugin', 'install', 'a@b'], 'install', 'user')).toEqual([
      'plugin',
      'install',
      'a@b',
    ])
  })

  it('ignores a scope it does not know, rather than passing it on', () => {
    expect(withScope(['plugin', 'update', 'a@b'], 'update', 'nonsense')).toEqual([
      'plugin',
      'update',
      'a@b',
    ])
    expect(withScope(['plugin', 'update', 'a@b'], 'update', undefined)).toHaveLength(3)
  })
})
