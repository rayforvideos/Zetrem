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

const DOCS = ['README.md', 'CONTRIBUTING.md']

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
    expect(stray, 'end the sentence, or take a comma').toEqual([])
  })

  it('holds the documents to the same rule, since a person reads those too', async () => {
    const stray: string[] = []
    for (const name of DOCS) {
      const text = await readFile(name, 'utf8')
      for (const line of text.split('\n')) {
        if (!line.includes('—')) continue
        stray.push(`${name}: ${line.trim().slice(0, 80)}`)
      }
    }
    expect(stray, 'the docs end a sentence too, or take a comma').toEqual([])
  })
})

describe('the commit convention says which language goes where', () => {
  it('asks for an English subject and body, with no bilingual block', async () => {
    const text = await readFile('CONTRIBUTING.md', 'utf8')
    expect(text).toContain('Subject and body, both in English')
    expect(text).not.toContain('한국어')
  })
})
