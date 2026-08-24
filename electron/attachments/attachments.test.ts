import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Attached } from '@/entities/attachment/lib/attachment/attachment.types'

type Channel = (event: unknown, ...args: unknown[]) => unknown

// Everything the module touches outside itself is mocked here, and every mock
// writes into this one record, so a test reads the outside world from one place.
const boundary = vi.hoisted(() => ({
  channels: new Map<string, Channel>(),
  picked: [] as string[],
  canceled: false,
  project: null as string | null,
}))

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: async () => ({ canceled: boundary.canceled, filePaths: boundary.picked }),
  },
}))

vi.mock('../ipc/ipc', () => ({
  handle: (channel: string, listener: Channel) => boundary.channels.set(channel, listener),
  on: (channel: string, listener: Channel) => boundary.channels.set(channel, listener),
}))

vi.mock('../project-memory/project-memory', () => ({ recallProject: async () => boundary.project }))

function fire(channel: string, ...args: unknown[]): unknown {
  const listener = boundary.channels.get(channel)
  if (listener === undefined) throw new Error(`nothing listens on ${channel}`)
  return listener({}, ...args)
}

const pick = (): Promise<string[]> => fire('files:pick') as Promise<string[]>
const readFiles = (paths: unknown): Promise<Attached[]> =>
  fire('files:read', paths) as Promise<Attached[]>

let scratch: string

function fileNamed(name: string, body = 'hello'): string {
  const path = join(scratch, name)
  writeFileSync(path, body)
  return path
}

beforeEach(async () => {
  boundary.channels.clear()
  boundary.picked = []
  boundary.canceled = false
  boundary.project = null
  scratch = mkdtempSync(join(tmpdir(), 'zetrem-attachments-'))
  vi.resetModules()
  const attachments = await import('./attachments')
  attachments.registerAttachments()
})

describe('reading a file the user chose', () => {
  it('serves a path the dialog handed back', async () => {
    const path = fileNamed('picked.txt')
    boundary.picked = [path]
    await pick()

    const found = await readFiles([path])

    expect(found.map((file) => file.path)).toEqual([path])
    expect(found[0]?.name).toBe('picked.txt')
  })

  it('serves a path admitted on the way out of a drop, since preload saw the real file', async () => {
    const path = fileNamed('dropped.txt')
    fire('files:admit', path)

    const found = await readFiles([path])

    expect(found.map((file) => file.path)).toEqual([path])
  })
})

describe('reading a file nobody chose', () => {
  it('hands back nothing for a path the renderer made up, though it sits on disk', async () => {
    const path = fileNamed('secret.txt')

    const found = await readFiles([path])

    expect(found).toEqual([])
  })

  it('keeps the picked file and drops the made up one asked for alongside it', async () => {
    const mine = fileNamed('mine.txt')
    const theirs = fileNamed('theirs.txt')
    boundary.picked = [mine]
    await pick()

    const found = await readFiles([theirs, mine])

    expect(found.map((file) => file.path)).toEqual([mine])
  })

  it('hands back nothing when the paths are not even a list', async () => {
    expect(await readFiles('a string')).toEqual([])
  })
})

describe('an admit that means nothing', () => {
  it('ignores a path that is not text and an empty one, so neither becomes readable', async () => {
    const path = fileNamed('real.txt')
    fire('files:admit', 7)
    fire('files:admit', '')
    fire('files:admit', null)

    expect(await readFiles([7, '', null, path])).toEqual([])
  })
})

describe('the room the admitted paths take up', () => {
  it('forgets the oldest once past the cap, and still serves the newest', async () => {
    const first = fileNamed('first.txt')
    const last = fileNamed('last.txt')
    fire('files:admit', first)
    for (let i = 0; i < 511; i += 1) fire('files:admit', join(scratch, `filler-${i}.txt`))
    fire('files:admit', last)

    const found = await readFiles([first, last])

    expect(found.map((file) => file.path)).toEqual([last])
  })
})

describe('a chosen path that is not a file to read', () => {
  it('hands back nothing for a directory, even though the dialog named it', async () => {
    const dir = join(scratch, 'folder')
    mkdirSync(dir)
    boundary.picked = [dir]
    await pick()

    expect(await readFiles([dir])).toEqual([])
  })

  it('hands back nothing for an admitted path that has since gone away', async () => {
    const gone = join(scratch, 'gone.txt')
    fire('files:admit', gone)

    expect(await readFiles([gone])).toEqual([])
  })
})

describe('a dialog the user waved off', () => {
  it('admits nothing when the pick was canceled', async () => {
    const path = fileNamed('never.txt')
    boundary.picked = [path]
    boundary.canceled = true

    expect(await pick()).toEqual([])
    expect(await readFiles([path])).toEqual([])
  })
})
