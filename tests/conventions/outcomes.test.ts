import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

// A main-process handler answers with an Outcome; the renderer reads why and
// says it in words. A throw crosses the bridge as "Error invoking remote
// method", which is only right for a request that should never have been made.
const MAY_THROW = [
  // an untrusted sender
  join('electron', 'ipc', 'ipc.ts'),
  // a path outside the roster folder
  join('electron', 'agents', 'agent-store', 'agent-store.ts'),
]

async function sources(dir: string): Promise<string[]> {
  const names = await readdir(join(ROOT, dir), { recursive: true })
  return names
    .filter((name) => /\.tsx?$/.test(name) && !name.includes('.test.'))
    .map((name) => join(dir, name))
}

describe('a failure crosses a boundary as an Outcome', () => {
  it('lets main throw only where the request itself was wrong', async () => {
    const throwing: string[] = []
    for (const file of await sources('electron')) {
      const text = await readFile(join(ROOT, file), 'utf8')
      if (/throw new Error\(/.test(text)) throwing.push(file)
    }
    expect(throwing.sort(), 'answer with lost(code, said) instead').toEqual([...MAY_THROW].sort())
  })

  it('declares no result shape of its own beside Outcome', async () => {
    const stray: string[] = []
    for (const file of [...(await sources('src')), ...(await sources('electron'))]) {
      if (file.endsWith(join('outcome', 'outcome.types.ts'))) continue
      const text = await readFile(join(ROOT, file), 'utf8')
      if (/\bok\??: boolean\b/.test(text)) stray.push(file)
    }
    expect(stray, 'use Outcome<T> from shared/lib/outcome').toEqual([])
  })
})
