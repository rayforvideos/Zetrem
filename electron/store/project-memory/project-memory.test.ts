import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const boundary = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => boundary.userData },
}))

const { mergeRecent, recallProject, recentProjects, rememberProject } = await import(
  './project-memory'
)

let home = ''

// A recent entry only counts when the folder is still there to open.
const realDir = (name: string): string => {
  const dir = join(home, name)
  mkdirSync(dir, { recursive: true })
  return dir
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'zetrem-projects-'))
  boundary.userData = join(home, 'user-data')
  mkdirSync(boundary.userData, { recursive: true })
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('the list of folders someone worked in', () => {
  it('puts the latest first and drops its older mention', () => {
    expect(mergeRecent(['/a', '/b'], '/b')).toEqual(['/b', '/a'])
  })

  it('holds eight, letting the oldest go', () => {
    const eight = ['/1', '/2', '/3', '/4', '/5', '/6', '/7', '/8']
    expect(mergeRecent(eight, '/9')).toEqual(['/9', '/1', '/2', '/3', '/4', '/5', '/6', '/7'])
  })

  it('remembers each pick, most recent first', async () => {
    const a = realDir('one')
    const b = realDir('two')
    await rememberProject(a)
    await rememberProject(b)
    expect(await recallProject()).toBe(b)
    expect(await recentProjects()).toEqual([b, a])
  })

  it('leaves out a folder that is gone', async () => {
    const a = realDir('kept')
    const b = realDir('deleted')
    await rememberProject(a)
    await rememberProject(b)
    rmSync(b, { recursive: true })
    expect(await recentProjects()).toEqual([a])
  })

  it('reads the file a version without a list wrote', async () => {
    const a = realDir('old-style')
    writeFileSync(join(boundary.userData, 'project.json'), JSON.stringify({ path: a }))
    expect(await recentProjects()).toEqual([a])
    expect(await recallProject()).toBe(a)
  })

  it('keeps the list a pick before it already made', async () => {
    const a = realDir('first')
    const b = realDir('second')
    await rememberProject(a)
    await rememberProject(b)
    await rememberProject(a)
    const written = JSON.parse(readFileSync(join(boundary.userData, 'project.json'), 'utf8')) as {
      path: string
      recent: string[]
    }
    expect(written.path).toBe(a)
    expect(written.recent).toEqual([a, b])
  })
})
