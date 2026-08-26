import { readdir, readFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['src', 'electron', 'tests']

type Entry = { dir: string; name: string }

async function walk(dir: string, out: Entry[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else out.push({ dir, name: entry.name })
  }
}

async function entries(): Promise<Entry[]> {
  const out: Entry[] = []
  for (const root of ROOTS) await walk(root, out)
  return out
}

const isTest = (name: string) => /\.test\.tsx?$/.test(name)
const isSource = (name: string) => /\.tsx?$/.test(name) && !isTest(name)
const stemOf = (name: string) => name.replace(/(\.test)?\.tsx?$/, '')

describe('a hook is named the way it is called', () => {
  it('writes a hook file in camelCase, since useAgent is what the code says', async () => {
    const stray: string[] = []
    for (const entry of await entries()) {
      if (!isSource(entry.name) && !isTest(entry.name)) continue
      if (entry.dir.startsWith('tests')) continue
      const stem = stemOf(entry.name)
      if (!/^use[A-Z-]/.test(stem)) continue
      if (!stem.includes('-')) continue
      stray.push(join(entry.dir, entry.name))
    }
    expect(stray, 'name it useAgentDefs.ts, not use-agent-defs.ts').toEqual([])
  })
})

describe('a test lives in its own module folder', () => {
  it('gives a module with a test a folder of its own name', async () => {
    const all = await entries()
    const stray: string[] = []
    for (const entry of all) {
      if (!isTest(entry.name) || entry.dir.startsWith('tests')) continue
      const folder = entry.dir.split(sep).at(-1)
      const owns = all.some(
        (other) => other.dir === entry.dir && isSource(other.name) && stemOf(other.name) === folder,
      )
      if (!owns) stray.push(join(entry.dir, entry.name))
    }
    expect(stray, 'a module keeps its test beside it: example/example.test.ts').toEqual([])
  })

  it('leaves no tested module sitting flat outside its folder', async () => {
    const all = await entries()
    const stray: string[] = []
    for (const entry of all) {
      if (!isSource(entry.name) || entry.dir.startsWith('tests')) continue
      const hasTest = all.some(
        (other) =>
          other.dir === entry.dir &&
          isTest(other.name) &&
          stemOf(other.name) === stemOf(entry.name),
      )
      if (!hasTest) continue
      const folder = entry.dir.split(sep).at(-1)
      if (folder !== stemOf(entry.name)) stray.push(join(entry.dir, entry.name))
    }
    expect(stray).toEqual([])
  })
})

const LAYERS = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']

function layerOf(path: string): string | null {
  const parts = path.split(sep)
  if (parts[0] !== 'src') return null
  return parts[1] !== undefined && LAYERS.includes(parts[1]) ? parts[1] : null
}

describe('layers lean one way only', () => {
  it('never imports an upper layer from a lower one', async () => {
    const stray: string[] = []
    for (const entry of await entries()) {
      const from = layerOf(entry.dir)
      if (from === null || !/\.tsx?$/.test(entry.name)) continue
      const text = await readFile(join(entry.dir, entry.name), 'utf8')
      for (const match of text.matchAll(/from '@\/([^']+)'/g)) {
        const to = layerOf(join('src', match[1] as string))
        if (to === null) continue
        if (LAYERS.indexOf(to) > LAYERS.indexOf(from)) {
          stray.push(`${from} → ${to}  ${join(entry.dir, entry.name)}`)
        }
      }
    }
    expect(stray, 'shared knows no entities, widgets know no pages').toEqual([])
  })

  it('keeps shared/ui for shadcn, with no component that knows the domain', async () => {
    const names = (await readdir(join('src', 'shared', 'ui'))).filter((name) =>
      name.endsWith('.tsx'),
    )
    const stray: string[] = []
    for (const name of names) {
      const text = await readFile(join('src', 'shared', 'ui', name), 'utf8')
      if (/from '@\/(entities|widgets|pages|app)/.test(text)) stray.push(name)
    }
    expect(stray, 'what knows a domain lives beside that domain').toEqual([])
  })
})
