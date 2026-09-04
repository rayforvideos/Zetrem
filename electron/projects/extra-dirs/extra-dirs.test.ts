import { describe, expect, it } from 'vitest'
import { addDirArgs, usableDirs, withDir, withoutDir } from './extra-dirs'
import type { DirDeps } from './extra-dirs.types'

// The disk, as far as these need one: what is a folder, and what it really is.
function disk(real: Record<string, string>): DirDeps {
  return { realDir: (path) => real[path] ?? null }
}

const HERE = disk({
  '/work/app': '/work/app',
  '/work/specs': '/work/specs',
  '/work/lib': '/work/lib',
  '/link/specs': '/work/specs',
})

describe('the extra folders a session is given', () => {
  it('passes each one as its own --add-dir, in the order they were added', () => {
    expect(addDirArgs('/work/app', ['/work/specs', '/work/lib'], HERE)).toEqual([
      '--add-dir',
      '/work/specs',
      '--add-dir',
      '/work/lib',
    ])
  })

  it('gives nothing when nothing was added', () => {
    expect(addDirArgs('/work/app', [], HERE)).toEqual([])
  })

  it('leaves out a folder that is no longer there, and keeps the rest', () => {
    expect(usableDirs('/work/app', ['/work/gone', '/work/lib'], HERE)).toEqual(['/work/lib'])
  })

  it('leaves out the project folder, which the session already has', () => {
    expect(usableDirs('/work/app', ['/work/app'], HERE)).toEqual([])
  })

  it('resolves a symlink, so one folder reached two ways is passed once', () => {
    expect(usableDirs('/work/app', ['/link/specs', '/work/specs'], HERE)).toEqual(['/work/specs'])
  })

  it('passes a folder once when it was stored twice', () => {
    expect(usableDirs('/work/app', ['/work/lib', '/work/lib'], HERE)).toEqual(['/work/lib'])
  })

  it('reads the project folder through its real path too', () => {
    const linked = disk({ '/link/app': '/work/app', '/work/app': '/work/app' })
    expect(usableDirs('/link/app', ['/work/app'], linked)).toEqual([])
  })
})

describe('adding and removing an extra folder', () => {
  it('stores the folder chosen, under the path the session will be given', () => {
    expect(withDir('/work/app', ['/work/lib'], '/link/specs', HERE)).toEqual([
      '/work/lib',
      '/work/specs',
    ])
  })

  it('refuses a folder that is not there, rather than storing a dead row', () => {
    expect(withDir('/work/app', [], '/work/gone', HERE)).toBeNull()
  })

  it('refuses the project folder, which would add nothing', () => {
    expect(withDir('/work/app', [], '/work/app', HERE)).toBeNull()
  })

  it('refuses one already listed, however it was reached', () => {
    expect(withDir('/work/app', ['/work/specs'], '/link/specs', HERE)).toBeNull()
  })

  it('takes a folder away by the row shown', () => {
    expect(withoutDir(['/work/specs', '/work/lib'], '/work/specs', HERE)).toEqual(['/work/lib'])
  })

  it('takes away one stored under another name for the same folder', () => {
    expect(withoutDir(['/link/specs'], '/work/specs', HERE)).toEqual([])
  })

  it('takes away a folder that has since gone, so the list can be cleaned', () => {
    expect(withoutDir(['/work/gone', '/work/lib'], '/work/gone', HERE)).toEqual(['/work/lib'])
  })
})
