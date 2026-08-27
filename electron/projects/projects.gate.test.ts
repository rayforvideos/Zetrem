import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredProject } from './projects.types'

type Channel = (event: unknown, ...args: unknown[]) => unknown

const boundary = vi.hoisted(() => ({
  userData: '',
  channels: new Map<string, Channel>(),
  picked: [] as string[],
  canceled: false,
}))

vi.mock('electron', () => ({
  app: { getPath: () => boundary.userData },
  dialog: {
    showOpenDialog: async () => ({ canceled: boundary.canceled, filePaths: boundary.picked }),
  },
}))

vi.mock('../ipc/ipc', () => ({
  handle: (channel: string, listener: Channel) => boundary.channels.set(channel, listener),
}))

function fire(channel: string, ...args: unknown[]): unknown {
  const listener = boundary.channels.get(channel)
  if (listener === undefined) throw new Error(`nothing listens on ${channel}`)
  return listener({}, ...args)
}

const pick = (): Promise<string | null> => fire('project:pick') as Promise<string | null>
const create = (path: unknown): Promise<StoredProject | null> =>
  fire('project:create', path) as Promise<StoredProject | null>
const repath = (id: string, path: unknown): Promise<StoredProject | null> =>
  fire('project:repath', id, path) as Promise<StoredProject | null>

let home = ''

const dir = (name: string): string => {
  const path = join(home, name)
  mkdirSync(path, { recursive: true })
  return path
}

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'zetrem-project-gate-'))
  boundary.userData = join(home, 'user-data')
  mkdirSync(boundary.userData, { recursive: true })
  boundary.channels.clear()
  boundary.picked = []
  boundary.canceled = false
  vi.resetModules()
  const projects = await import('./projects')
  projects.registerProjects()
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('a project is only ever a folder the dialog handed out', () => {
  it('creates the project for the folder that was just picked', async () => {
    const shop = dir('shop')
    boundary.picked = [shop]
    expect(await pick()).toBe(shop)
    const made = await create(shop)
    expect(made?.path).toBe(shop)
  })

  it('refuses a folder the renderer named on its own, even a real one', async () => {
    const elsewhere = dir('elsewhere')
    expect(await create(elsewhere)).toBeNull()
    expect(await create('/')).toBeNull()
    expect(await create(42)).toBeNull()
  })

  it('moves a project only onto a folder that was picked', async () => {
    const shop = dir('shop')
    const moved = dir('shop-moved')
    boundary.picked = [shop]
    await pick()
    const made = await create(shop)
    if (made === null) throw new Error('the picked folder should have become a project')
    expect(await repath(made.id, moved)).toBeNull()
    boundary.picked = [moved]
    await pick()
    expect((await repath(made.id, moved))?.path).toBe(moved)
  })

  it('hands out nothing when the dialog was cancelled', async () => {
    boundary.canceled = true
    expect(await pick()).toBeNull()
  })
})
