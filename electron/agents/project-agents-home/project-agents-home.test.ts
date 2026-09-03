import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The module reaches for userData only when no root is handed to it, and no
// test does that; electron is stubbed so importing it outside the app works.
vi.mock('electron', () => ({ app: { getPath: () => tmpdir() } }))

const { dropProjectAgents, moveProjectAgents } = await import('./project-agents-home')
const { projectKey } = await import('../../store/project-key/project-key')

let root = ''

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'zetrem-project-agents-'))
})

async function keep(path: string, name: string, said: string): Promise<void> {
  const dir = join(root, projectKey(path))
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), said)
}

function drawer(path: string): string {
  return join(root, projectKey(path))
}

describe('moveProjectAgents: a project that moves house takes its people', () => {
  it('carries the whole drawer over to the new path', async () => {
    await keep('/work/shop', 'ray.md', 'reads what changed')
    await moveProjectAgents('/work/shop', '/elsewhere/shop', root)
    expect(existsSync(drawer('/work/shop'))).toBe(false)
    expect(await readdir(drawer('/elsewhere/shop'))).toEqual(['ray.md'])
  })

  it('does nothing when the project never kept anyone of its own', async () => {
    await moveProjectAgents('/work/shop', '/elsewhere/shop', root)
    expect(existsSync(drawer('/elsewhere/shop'))).toBe(false)
  })

  it('does nothing when both paths name the same folder', async () => {
    await keep('/work/shop', 'ray.md', 'reads what changed')
    await moveProjectAgents('/work/shop', '/work/shop/', root)
    expect(await readdir(drawer('/work/shop'))).toEqual(['ray.md'])
  })

  it('keeps the people already at the new path and brings the rest across', async () => {
    await keep('/work/shop', 'ray.md', 'the old one')
    await keep('/work/shop', 'kim.md', 'only over here')
    await keep('/elsewhere/shop', 'ray.md', 'the one in use')
    await moveProjectAgents('/work/shop', '/elsewhere/shop', root)
    const to = drawer('/elsewhere/shop')
    expect((await readdir(to)).sort()).toEqual(['kim.md', 'ray.md'])
    expect(await readFile(join(to, 'ray.md'), 'utf8')).toBe('the one in use')
    expect(existsSync(drawer('/work/shop'))).toBe(false)
  })

  it('reads two names that differ only in case as one person', async () => {
    // A rename on macOS or Windows would replace the file that is in use.
    await keep('/work/shop', 'Ray.md', 'the old one')
    await keep('/elsewhere/shop', 'ray.md', 'the one in use')
    await moveProjectAgents('/work/shop', '/elsewhere/shop', root)
    const to = drawer('/elsewhere/shop')
    expect(await readdir(to)).toEqual(['ray.md'])
    expect(await readFile(join(to, 'ray.md'), 'utf8')).toBe('the one in use')
  })
})

describe('dropProjectAgents: a forgotten project leaves nothing behind', () => {
  it('removes the drawer and everyone in it', async () => {
    await keep('/work/shop', 'ray.md', 'reads what changed')
    await dropProjectAgents('/work/shop', root)
    expect(existsSync(drawer('/work/shop'))).toBe(false)
  })

  it('is quiet about a project that never kept anyone', async () => {
    await expect(dropProjectAgents('/work/shop', root)).resolves.toBeUndefined()
  })

  it('leaves the drawer of every other project alone', async () => {
    await keep('/work/shop', 'ray.md', 'reads what changed')
    await keep('/work/blog', 'kim.md', 'writes the notes')
    await dropProjectAgents('/work/shop', root)
    expect(existsSync(drawer('/work/blog'))).toBe(true)
  })
})
