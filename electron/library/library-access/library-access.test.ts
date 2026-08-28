import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => process.env.ZT_TEST_USERDATA ?? '' },
}))

import { libraryOpenToAgents, setLibraryOpenToAgents } from './library-access'

let userData = ''

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'zetrem-ud-'))
  process.env.ZT_TEST_USERDATA = userData
})

afterEach(() => {
  rmSync(userData, { recursive: true, force: true })
})

describe('whether agents may read a project library', () => {
  it('is open until someone closes it', async () => {
    expect(await libraryOpenToAgents('/a')).toBe(true)
  })

  it('remembers the choice per project, across reads', async () => {
    await setLibraryOpenToAgents('/a', false)
    expect(await libraryOpenToAgents('/a')).toBe(false)
    expect(await libraryOpenToAgents('/b')).toBe(true)
    await setLibraryOpenToAgents('/a', true)
    expect(await libraryOpenToAgents('/a')).toBe(true)
  })

  it('sets a broken file aside, treats every project as open, and keeps a copy', async () => {
    const { writeFileSync, existsSync } = await import('node:fs')
    writeFileSync(join(userData, 'library-agents.json'), '{not json')
    expect(await libraryOpenToAgents('/a')).toBe(true)
    expect(existsSync(join(userData, 'library-agents.json.broken'))).toBe(true)
    expect(existsSync(join(userData, 'library-agents.json'))).toBe(false)
  })
})
