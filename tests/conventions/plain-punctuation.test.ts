import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const OURS = [
  join('src', 'entities'),
  join('src', 'pages'),
  join('src', 'widgets'),
  join('src', 'app'),
  join('src', 'shared'),
]

const SHADCN = join('src', 'shared', 'ui')

async function ourFiles(): Promise<{ path: string; text: string }[]> {
  const out: { path: string; text: string }[] = []
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (full.startsWith(SHADCN)) continue
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
      out.push({ path: full, text: await readFile(full, 'utf8') })
    }
  }
  for (const dir of OURS) await walk(dir)
  return out
}

describe('what we say to a person uses ordinary punctuation', () => {
  it('writes no em dash, and ends a sentence or takes a comma instead', async () => {
    const stray: string[] = []
    for (const file of await ourFiles()) {
      for (const line of file.text.split('\n')) {
        if (!line.includes('—')) continue
        if (line.trimStart().startsWith('//')) continue
        stray.push(`${file.path}: ${line.trim().slice(0, 80)}`)
      }
    }
    expect(stray, '마침표나 쉼표로 끊는다').toEqual([])
  })
})
