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

describe('타입은 로직과 같은 파일에 살지 않는다', () => {
  it('한 파일이 타입 선언과 로직을 함께 내보내지 않는다', async () => {
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

  it('.types 파일은 값을 내보내지 않는다 — 지워도 런타임이 그대로여야 한다', async () => {
    const stray: string[] = []
    for (const entry of await sources()) {
      if (!entry.name.endsWith('.types.ts')) continue
      const text = await readFile(join(entry.dir, entry.name), 'utf8')
      if (DECLARES_LOGIC.test(text)) stray.push(join(entry.dir, entry.name))
    }
    expect(stray, '값이 필요하면 로직 파일로 간다').toEqual([])
  })

  it('.types 파일 이름은 제 모듈을 따른다', async () => {
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

describe('레이어 밖에서도 이름은 배럴이 정한다', () => {
  it('엔티티 배럴은 타입을 .types 에서 내보낸다 — 타입만 쓰는 쪽이 로직에 묶이지 않게', async () => {
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
