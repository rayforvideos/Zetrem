import { delimiter } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canFind, commandNames, findCommand } from './login-path'

const windows = process.platform === 'win32'

describe('finding claude works differently on each machine', () => {
  it('looks for the plain name on macOS and Linux', () => {
    if (windows) return
    expect(commandNames('claude')).toEqual(['claude'])
  })

  it('splits PATH on the separator that machine uses', () => {
    const dirs = ['/nowhere-a', '/nowhere-b'].join(delimiter)
    expect(findCommand('definitely-not-a-real-binary', dirs)).toBeNull()
    expect(canFind('definitely-not-a-real-binary', dirs)).toBe(false)
  })

  it('skips an empty entry, so a trailing separator does not search the current folder', () => {
    expect(findCommand('claude', delimiter + delimiter)).toBeNull()
  })

  it('gives back an absolute path, because a bare name will not launch on Windows', () => {
    const found = findCommand(windows ? 'cmd' : 'sh', process.env.PATH ?? '')
    expect(found, '이 기계에 기본 셸은 있어야 한다').not.toBeNull()
    expect(found).toContain(windows ? 'cmd' : 'sh')
    expect(found?.includes('/') || found?.includes('\\')).toBe(true)
  })
})
