import { mkdtemp, readFile, readdir, stat, writeFile, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { partnerOf, saveFile, saveSecretFile } from './save-file'

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
    const dead = partnerOf(path)
    await writeFile(dead, 'half of something', 'utf8')
    const old = new Date(Date.now() - 120_000)
    await utimes(dead, old, old)
    await saveFile(path, 'whole')
    expect(await readFile(path, 'utf8')).toBe('whole')
    expect(await readdir(dir)).toEqual(['settings.json'])
  })

  it('writes beside the file it replaces, so the rename stays on one volume', () => {
    expect(partnerOf('/a/b/c.json', 'w1')).toBe('/a/b/c.json.w1.saving')
  })

  it('gives every write its own partner, so two at once cannot mix', async () => {
    const path = join(dir, 'settings.json')
    expect(partnerOf(path)).not.toBe(partnerOf(path))
    await Promise.all([saveFile(path, 'first'), saveFile(path, 'second')])
    expect(['first', 'second']).toContain(await readFile(path, 'utf8'))
    expect(await readdir(dir)).toEqual(['settings.json'])
  })
})

describe('saveSecretFile: a secret is written whole and read by nobody else', () => {
  it('writes the bytes it was given and leaves nothing behind', async () => {
    const path = join(dir, 'slot.bin')
    await saveSecretFile(path, Buffer.from([0, 1, 2, 250]))
    expect([...(await readFile(path))]).toEqual([0, 1, 2, 250])
    expect(await readdir(dir)).toEqual(['slot.bin'])
  })

  it('gives the file the mode it must keep', async () => {
    const path = join(dir, 'slot.bin')
    await saveSecretFile(path, Buffer.from('x'))
    if (process.platform !== 'win32') expect((await stat(path)).mode & 0o777).toBe(0o600)
  })

  it('does not touch the old secret when the new one cannot be written', async () => {
    const path = join(dir, 'slot.bin')
    await saveSecretFile(path, Buffer.from('the good one'))
    await expect(saveSecretFile(join(dir, 'nowhere', 'x.bin'), Buffer.from('y'))).rejects.toThrow()
    expect(await readFile(path, 'utf8')).toBe('the good one')
  })
})
