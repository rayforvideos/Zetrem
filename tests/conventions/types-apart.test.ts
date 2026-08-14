import { readdir, readFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['src', 'electron']

type Entry = { dir: string; name: string }

async function walk(dir: string, out: Entry[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else out.push({ dir, name: entry.name })
  }
}

async function sources(): Promise<Entry[]> {
  const out: Entry[] = []
  for (const root of ROOTS) await walk(root, out)
  return out.filter((e) => /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
}

const DECLARES_TYPE = /^export (?:type|interface) [A-Za-z]/m
const DECLARES_LOGIC = /^export (?:async function|function|const|class) /m

describe('types do not live in the same file as logic', () => {
  it('never exports a type declaration and logic from one file', async () => {
    const stray: string[] = []
    for (const entry of await sources()) {
      if (entry.name.endsWith('.types.ts')) continue
      const text = await readFile(join(entry.dir, entry.name), 'utf8')
      if (DECLARES_TYPE.test(text) && DECLARES_LOGIC.test(text)) {
        stray.push(join(entry.dir, entry.name))
      }
    }
    expect(stray, '타입은 <모듈>.types.ts 로 옮긴다').toEqual([])
  })

  it('exports no value from a types file, so deleting it changes nothing that runs', async () => {
    const stray: string[] = []
    for (const entry of await sources()) {
      if (!entry.name.endsWith('.types.ts')) continue
      const text = await readFile(join(entry.dir, entry.name), 'utf8')
      if (DECLARES_LOGIC.test(text)) stray.push(join(entry.dir, entry.name))
    }
    expect(stray, '값이 필요하면 로직 파일로 간다').toEqual([])
  })

  it('names a types file after its module', async () => {
    const all = await sources()
    const stray: string[] = []
    for (const entry of all) {
      if (!entry.name.endsWith('.types.ts')) continue
      const stem = entry.name.replace('.types.ts', '')
      const owner = all.some(
        (other) =>
          other.dir === entry.dir &&
          !other.name.endsWith('.types.ts') &&
          other.name.replace(/\.tsx?$/, '') === stem,
      )
      if (!owner) stray.push(join(entry.dir, entry.name))
    }
    expect(stray, '<모듈>.ts 옆의 <모듈>.types.ts 여야 한다').toEqual([])
  })
})

describe('the barrel decides the names the rest of the app sees', () => {
  it('exports types from the types file, so code that needs a shape is not tied to the code', async () => {
    const stray: string[] = []
    for (const entry of await sources()) {
      if (entry.name !== 'index.ts' || !entry.dir.includes(join('src', 'entities'))) continue
      const text = await readFile(join(entry.dir, entry.name), 'utf8')
      for (const match of text.matchAll(/export type \{[^}]*\} from '(\.[^']+)'/gs)) {
        const spec = match[1] as string
        if (spec.endsWith('.types')) continue
        const guess = join(entry.dir, `${spec}.types.ts`.replace(/\//g, sep))
        const exists = await readFile(guess, 'utf8').then(
          () => true,
          () => false,
        )
        if (exists) stray.push(`${join(entry.dir, entry.name)} → ${spec}`)
      }
    }
    expect(stray).toEqual([])
  })
})
