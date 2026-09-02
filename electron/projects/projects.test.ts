import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const boundary = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => boundary.userData },
}))

const { createProject, forgetProject, listProjects, openProject, repathProject, restoreProject } =
  await import('./projects')
const { recallProject } = await import('../store/project-memory/project-memory')
const { projectKey } = await import('../store/project-key/project-key')

let home = ''

const dir = (name: string): string => {
  const path = join(home, name)
  mkdirSync(path, { recursive: true })
  return path
}

// Where the app keeps the teammates a project has to itself.
const teammates = (path: string): string =>
  join(boundary.userData, 'project-agents', projectKey(path))

const keepTeammate = (path: string, name: string): void => {
  const at = teammates(path)
  mkdirSync(at, { recursive: true })
  writeFileSync(join(at, name), 'reads what changed')
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'zetrem-projects-'))
  boundary.userData = join(home, 'user-data')
  mkdirSync(boundary.userData, { recursive: true })
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('the projects a person can come back to', () => {
  it('lifts the folders a version without projects knew into projects, chats intact', async () => {
    // A project's id IS the path, so the transcript folder its chats already
    // live in (keyed by a hash of that same string) is reached unchanged.
    const a = dir('shop')
    const b = dir('blog')
    writeFileSync(
      join(boundary.userData, 'project.json'),
      JSON.stringify({ path: a, recent: [a, b] }),
    )
    const found = await listProjects()
    expect(found.map((one) => one.id)).toEqual([a, b])
    expect(found[0]?.name).toBe('shop')
    expect((await restoreProject())?.id).toBe(a)
  })

  it('creates a project on a folder, names it after it, and opens it', async () => {
    const path = dir('shop')
    const made = await createProject(path)
    expect(made?.name).toBe('shop')
    expect(made?.id).not.toBe(path)
    expect((await restoreProject())?.id).toBe(made?.id)
    expect(await recallProject()).toBe(path)
  })

  it('refuses a creation with no folder to stand on', async () => {
    expect(await createProject('')).toBeNull()
    expect(await createProject('   ')).toBeNull()
  })

  it('moves a project onto another folder', async () => {
    const made = await createProject(dir('start'))
    const path = dir('shop')
    const moved = await repathProject(made?.id ?? '', path)
    expect(moved?.path).toBe(path)
    expect(await recallProject()).toBe(path)
  })

  it('takes the teammates kept for a project with it when it moves', async () => {
    const start = dir('start')
    const made = await createProject(start)
    keepTeammate(start, 'ray.md')
    const path = dir('shop')
    await repathProject(made?.id ?? '', path)
    expect(existsSync(teammates(start))).toBe(false)
    expect(readdirSync(teammates(path))).toEqual(['ray.md'])
  })

  it('moves no project it does not know, and onto no folder that is not there', async () => {
    const made = await createProject(dir('shop'))
    expect(await repathProject('nope', dir('blog'))).toBeNull()
    expect(await repathProject(made?.id ?? '', join(home, 'missing'))).toBeNull()
  })

  it('reopens instead of duplicating when the dialog lands on a known folder', async () => {
    const path = dir('shop')
    const first = await createProject(path, 1000)
    const again = await createProject(path, 2000)
    expect(again?.id).toBe(first?.id)
    expect(await listProjects()).toHaveLength(1)
  })

  it('refuses to split one folder into two projects', async () => {
    const path = dir('shop')
    const one = await createProject(path)
    const two = await createProject(path)
    expect(two?.id).toBe(one?.id)
    expect(await listProjects()).toHaveLength(1)
  })

  it('opening puts the project first and points the working folder at it', async () => {
    const a = dir('shop')
    const b = dir('blog')
    const one = await createProject(a, 1000)
    await createProject(b, 2000)
    expect(await openProject(one?.id ?? '', 3000)).not.toBeNull()
    expect((await listProjects())[0]?.id).toBe(one?.id)
    expect(await recallProject()).toBe(a)
  })

  it('forgets the entity and nothing on disk, and lets go of a forgotten current', async () => {
    const path = dir('shop')
    const made = await createProject(path)
    await forgetProject(made?.id ?? '')
    expect(await listProjects()).toEqual([])
    expect(await restoreProject()).toBeNull()
    expect(await recallProject()).toBeNull()
  })

  it('forgets the teammates it was keeping for that project alone', async () => {
    const path = dir('shop')
    const made = await createProject(path)
    keepTeammate(path, 'ray.md')
    await forgetProject(made?.id ?? '')
    expect(existsSync(teammates(path))).toBe(false)
    // The folder the project stood on is the person's, not the app's.
    expect(existsSync(path)).toBe(true)
  })

  it('keeps the drawer when another project still stands on that folder', async () => {
    const shop = dir('shop')
    const blog = dir('blog')
    const moved = await createProject(shop, 1000)
    await createProject(blog, 2000)
    keepTeammate(blog, 'ray.md')
    await repathProject(moved?.id ?? '', blog)
    await forgetProject(moved?.id ?? '')
    expect(existsSync(join(teammates(blog), 'ray.md'))).toBe(true)
  })

  it('takes two quick opens in turn, so the list and the working folder agree', async () => {
    const a = dir('shop')
    const b = dir('blog')
    const one = await createProject(a, 1000)
    const two = await createProject(b, 2000)
    await Promise.all([openProject(one?.id ?? '', 3000), openProject(two?.id ?? '', 4000)])
    expect((await listProjects())[0]?.id).toBe(two?.id)
    expect(await recallProject()).toBe(b)
    expect((await restoreProject())?.id).toBe(two?.id)
  })

  it('answers nothing for an id it never handed out', async () => {
    await createProject(dir('shop'))
    expect(await openProject('/somewhere/else', 1)).toBeNull()
  })

  it('refuses to create on a folder that does not exist', async () => {
    expect(await createProject(join(home, 'missing'))).toBeNull()
  })
})
