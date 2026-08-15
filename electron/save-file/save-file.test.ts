import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { partnerOf, saveFile } from './save-file'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'zt-save-'))
})

describe('saveFile: a file is never left half written', () => {
  it('writes what it was given', async () => {
    const path = join(dir, 'settings.json')
    await saveFile(path, '{"a":1}')
    expect(await readFile(path, 'utf8')).toBe('{"a":1}')
  })

  it('replaces what was there before', async () => {
    const path = join(dir, 'settings.json')
    await saveFile(path, 'first')
    await saveFile(path, 'second')
    expect(await readFile(path, 'utf8')).toBe('second')
  })

  it('leaves nothing behind once it is done', async () => {
    await saveFile(join(dir, 'settings.json'), 'x')
    expect(await readdir(dir)).toEqual(['settings.json'])
  })

  it('does not touch the old file when the new one cannot be written', async () => {
    const path = join(dir, 'settings.json')
    await saveFile(path, 'the good one')
    await expect(saveFile(join(dir, 'nowhere', 'deep', 'x.json'), 'y')).rejects.toThrow()
    expect(await readFile(path, 'utf8')).toBe('the good one')
  })

  it('clears its own leftovers when a write fails', async () => {
    const path = join(dir, 'gone', 'settings.json')
    await expect(saveFile(path, 'x')).rejects.toThrow()
    expect(await readdir(dir)).toEqual([])
  })

  it('overwrites a leftover from a run that died', async () => {
    const path = join(dir, 'settings.json')
    await writeFile(partnerOf(path), 'half of something', 'utf8')
    await saveFile(path, 'whole')
    expect(await readFile(path, 'utf8')).toBe('whole')
    expect(await readdir(dir)).toEqual(['settings.json'])
  })

  it('writes beside the file it replaces, so the rename stays on one volume', () => {
    expect(partnerOf('/a/b/c.json')).toBe('/a/b/c.json.saving')
  })
})
