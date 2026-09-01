import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { isGitWorkspace } from './git-workspace'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'zt-git-'))
})

describe('isGitWorkspace: whether a worktree can be cut from this folder', () => {
  it('says yes to an ordinary checkout, where .git is a folder', async () => {
    await mkdir(join(dir, '.git'))
    expect(isGitWorkspace(dir)).toBe(true)
  })

  it('says yes inside a worktree, where .git is a file pointing at the real one', async () => {
    await writeFile(join(dir, '.git'), 'gitdir: /somewhere/.git/worktrees/one\n')
    expect(isGitWorkspace(dir)).toBe(true)
  })

  it('says no where there is no repository at all', () => {
    expect(isGitWorkspace(dir)).toBe(false)
  })

  it('says no for a folder that is not there, which is the scratch case', () => {
    expect(isGitWorkspace(join(dir, 'never-made'))).toBe(false)
  })
})
