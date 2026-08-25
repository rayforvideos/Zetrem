import { mkdtemp, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { scratchWorkspace, workspaceDir } from './workspace-dir'

let userData = ''

beforeEach(async () => {
  userData = await mkdtemp(join(tmpdir(), 'zt-ud-'))
})

describe('workspaceDir: a run always has somewhere to run', () => {
  it('runs in the project when there is one', async () => {
    expect(await workspaceDir('/somewhere/project', userData)).toBe('/somewhere/project')
  })

  it('makes the scratch folder on a first launch, before anything spawns', async () => {
    const found = await workspaceDir(null, userData)
    expect(found).toBe(scratchWorkspace(userData))
    expect((await stat(found)).isDirectory()).toBe(true)
  })

  it('is happy to find the scratch folder already there', async () => {
    await workspaceDir(null, userData)
    const again = await workspaceDir(null, userData)
    expect((await stat(again)).isDirectory()).toBe(true)
  })

  it('treats an empty remembered path as no project', async () => {
    expect(await workspaceDir('', userData)).toBe(scratchWorkspace(userData))
  })
})
