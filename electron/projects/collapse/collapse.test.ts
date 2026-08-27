import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const boundary = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => boundary.userData },
}))

const { collapseCategories } = await import('./collapse')
const { transcriptKey } = await import('../../store/transcript-key/transcript-key')
const { CHAT_CAP } = await import('../../store/chat-cap/chat-cap')

let home = ''
let userData = ''

type Row = { id: string; name: string; path: string; createdAtMs: number; lastOpenedAtMs: number }

const folder = (project: string): string => join(userData, 'transcripts', transcriptKey(project))

function chat(project: string, id: string, atMs = 1_000): void {
  const dir = folder(project)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${id}.json`)
  writeFileSync(path, JSON.stringify({ id }))
  utimesSync(path, atMs / 1000, atMs / 1000)
}

function chatsIn(project: string): string[] {
  const dir = folder(project)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((one) => one.endsWith('.json'))
    .sort()
}

function overflowIn(project: string): string[] {
  const dir = join(folder(project), 'overflow')
  if (!existsSync(dir)) return []
  return readdirSync(dir).sort()
}

function memory(): { current: string | null; projects: Row[] } {
  return JSON.parse(readFileSync(join(userData, 'projects.json'), 'utf8'))
}

function write(current: string | null, projects: Row[]): void {
  writeFileSync(join(userData, 'projects.json'), JSON.stringify({ current, projects }))
}

const dir = (name: string): string => {
  const path = join(home, name)
  mkdirSync(path, { recursive: true })
  return path
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'zetrem-collapse-'))
  userData = join(home, 'user-data')
  boundary.userData = userData
  mkdirSync(userData, { recursive: true })
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('folding the categories of a folder back into one project', () => {
  it('leaves one project per folder, keeping the name the folder project wore', async () => {
    const shop = dir('shop')
    write('cat-1', [
      { id: shop, name: '출고 자동화', path: shop, createdAtMs: 1, lastOpenedAtMs: 1 },
      { id: 'cat-1', name: 'CS봇', path: shop, createdAtMs: 2, lastOpenedAtMs: 9 },
    ])

    await collapseCategories(userData)

    const after = memory()
    expect(after.projects).toHaveLength(1)
    expect(after.projects[0]?.id).toBe(shop)
    expect(after.projects[0]?.name).toBe('출고 자동화')
  })

  it('brings every chat of every category into the folder project', async () => {
    const shop = dir('shop')
    write(shop, [
      { id: shop, name: 'shop', path: shop, createdAtMs: 1, lastOpenedAtMs: 1 },
      { id: 'cat-1', name: 'CS봇', path: shop, createdAtMs: 2, lastOpenedAtMs: 2 },
    ])
    chat(shop, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    chat('cat-1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')

    await collapseCategories(userData)

    expect(chatsIn(shop)).toEqual([
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.json',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.json',
    ])
    expect(existsSync(folder('cat-1'))).toBe(false)
  })

  it('moves the current project onto the survivor when a category held it', async () => {
    const shop = dir('shop')
    write('cat-1', [
      { id: shop, name: 'shop', path: shop, createdAtMs: 1, lastOpenedAtMs: 1 },
      { id: 'cat-1', name: 'CS봇', path: shop, createdAtMs: 2, lastOpenedAtMs: 2 },
    ])

    await collapseCategories(userData)

    expect(memory().current).toBe(shop)
  })

  it('makes a folder project out of categories when none of them was the folder', async () => {
    const shop = dir('shop')
    write('cat-2', [
      { id: 'cat-1', name: '출고', path: shop, createdAtMs: 1, lastOpenedAtMs: 1 },
      { id: 'cat-2', name: 'CS봇', path: shop, createdAtMs: 2, lastOpenedAtMs: 2 },
    ])

    await collapseCategories(userData)

    const after = memory()
    expect(after.projects).toHaveLength(1)
    expect(after.projects[0]?.id).toBe(shop)
    expect(after.projects[0]?.name).toBe('shop')
    expect(after.current).toBe(shop)
  })

  it('changes nothing when every folder already holds one project', async () => {
    const shop = dir('shop')
    const blog = dir('blog')
    const rows: Row[] = [
      { id: shop, name: 'shop', path: shop, createdAtMs: 1, lastOpenedAtMs: 2 },
      { id: blog, name: 'blog', path: blog, createdAtMs: 1, lastOpenedAtMs: 1 },
    ]
    write(shop, rows)
    chat(shop, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const before = readFileSync(join(userData, 'projects.json'), 'utf8')

    await collapseCategories(userData)

    expect(readFileSync(join(userData, 'projects.json'), 'utf8')).toBe(before)
    expect(chatsIn(shop)).toEqual(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.json'])
  })

  it('never overwrites a chat already sitting in the folder project', async () => {
    const shop = dir('shop')
    write(shop, [
      { id: shop, name: 'shop', path: shop, createdAtMs: 1, lastOpenedAtMs: 1 },
      { id: 'cat-1', name: 'CS봇', path: shop, createdAtMs: 2, lastOpenedAtMs: 2 },
    ])
    const clash = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    chat(shop, clash)
    writeFileSync(join(folder(shop), `${clash}.json`), 'the one that was already here')
    chat('cat-1', clash)

    await collapseCategories(userData)

    expect(readFileSync(join(folder(shop), `${clash}.json`), 'utf8')).toBe(
      'the one that was already here',
    )
    expect(overflowIn(shop)).toHaveLength(1)
  })

  it('sets the overflow aside instead of letting the cap prune it away', async () => {
    // Merging can carry a folder past the cap, and the store prunes on every
    // autosave. Anything over the cap goes where the prune does not read.
    const shop = dir('shop')
    write(shop, [
      { id: shop, name: 'shop', path: shop, createdAtMs: 1, lastOpenedAtMs: 1 },
      { id: 'cat-1', name: 'CS봇', path: shop, createdAtMs: 2, lastOpenedAtMs: 2 },
    ])
    const id = (n: number): string => `${String(n).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
    for (let n = 0; n < CHAT_CAP; n += 1) chat(shop, id(n), 10_000 + n)
    for (let n = CHAT_CAP; n < CHAT_CAP + 5; n += 1) chat('cat-1', id(n), 1_000 + n)

    await collapseCategories(userData)

    expect(chatsIn(shop)).toHaveLength(CHAT_CAP)
    expect(overflowIn(shop)).toHaveLength(5)
  })

  it('keeps the freshest chats in the folder and sets the oldest aside', async () => {
    const shop = dir('shop')
    write(shop, [
      { id: shop, name: 'shop', path: shop, createdAtMs: 1, lastOpenedAtMs: 1 },
      { id: 'cat-1', name: 'CS봇', path: shop, createdAtMs: 2, lastOpenedAtMs: 2 },
    ])
    const id = (n: number): string => `${String(n).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
    for (let n = 0; n < CHAT_CAP; n += 1) chat(shop, id(n), 1_000 + n)
    chat('cat-1', id(999), 90_000)

    await collapseCategories(userData)

    expect(chatsIn(shop)).toContain(`${id(999)}.json`)
    expect(overflowIn(shop)).toEqual([`${id(0)}.json`])
  })
})
