import { mkdtemp, mkdir, readFile, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  frontOf,
  isNoteId,
  listMemory,
  mungedPath,
  readMemory,
  removeMemory,
  withoutIndexLine,
  writeMemory,
} from './agent-memory'
import type { MemoryDeps } from './agent-memory.types'

describe('mungedPath', () => {
  it('turns every character outside letters, digits and dashes into a dash', () => {
    expect(mungedPath('/Users/ray/workspace/Zetrem')).toBe('-Users-ray-workspace-Zetrem')
    expect(mungedPath('/Users/ray/.claude/jobs')).toBe('-Users-ray--claude-jobs')
    expect(mungedPath('/tmp/a_b.c d한')).toBe('-tmp-a-b-c-d-')
  })
})

describe('isNoteId', () => {
  it('takes a plain markdown file name', () => {
    expect(isNoteId('beta-version-scheme.md')).toBe(true)
  })

  it('refuses the index, traversal, and other shapes', () => {
    expect(isNoteId('MEMORY.md')).toBe(false)
    expect(isNoteId('../escape.md')).toBe(false)
    expect(isNoteId('a/b.md')).toBe(false)
    expect(isNoteId('.hidden.md')).toBe(false)
    expect(isNoteId('note.txt')).toBe(false)
  })
})

describe('frontOf', () => {
  it('reads name, description and type out of the frontmatter', () => {
    const front = frontOf(
      '---\nname: beta-scheme\ndescription: "how betas are numbered"\nmetadata:\n  type: project\n---\n\nbody',
    )
    expect(front).toEqual({
      name: 'beta-scheme',
      description: 'how betas are numbered',
      kind: 'project',
    })
  })

  it('answers empty for a file without frontmatter', () => {
    expect(frontOf('just a body')).toEqual({ name: '', description: '', kind: '' })
  })
})

describe('withoutIndexLine', () => {
  it('drops exactly the line linking the removed file', () => {
    const index = '- [A](a.md) — one\n- [B](b.md) — two\n- [C](c.md) — three'
    expect(withoutIndexLine(index, 'b.md')).toBe('- [A](a.md) — one\n- [C](c.md) — three')
  })
})

describe('over a real folder', () => {
  let deps: MemoryDeps
  let dir: string

  beforeEach(async () => {
    const projects = await mkdtemp(join(tmpdir(), 'zt-memory-'))
    dir = join(projects, mungedPath('/work/proj'), 'memory')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'one.md'),
      '---\nname: one-fact\ndescription: the first\nmetadata:\n  type: project\n---\n\nfact one\n',
    )
    await writeFile(join(dir, 'two.md'), 'no frontmatter here\n')
    await writeFile(join(dir, 'MEMORY.md'), '- [One](one.md) — the first\n- [Two](two.md) — bare\n')
    deps = { projectsDir: projects, here: () => Promise.resolve('/work/proj') }
  })

  it('lists the notes with their frontmatter and mtime, never the index', async () => {
    await utimes(join(dir, 'one.md'), new Date(1000), new Date(1_756_700_000_000))
    await utimes(join(dir, 'two.md'), new Date(1000), new Date(1_756_600_000_000))
    const listed = await listMemory(deps)
    expect(listed).toEqual({
      ok: true,
      value: [
        {
          id: 'one.md',
          name: 'one-fact',
          description: 'the first',
          kind: 'project',
          updated: 1_756_700_000_000,
        },
        { id: 'two.md', name: 'two', description: '', kind: '', updated: 1_756_600_000_000 },
      ],
    })
  })

  it('reads a note split from its frontmatter', async () => {
    expect(await readMemory(deps, 'one.md')).toEqual({
      ok: true,
      value: { name: 'one-fact', description: 'the first', kind: 'project', body: 'fact one\n' },
    })
    expect(await readMemory(deps, 'two.md')).toEqual({
      ok: true,
      value: { name: 'two', description: '', kind: '', body: 'no frontmatter here\n' },
    })
  })

  it('rewrites body and description while keeping the fence', async () => {
    expect(await writeMemory(deps, 'one.md', 'fact edited\n', 'the first, said better')).toEqual({
      ok: true,
      value: null,
    })
    const text = await readFile(join(dir, 'one.md'), 'utf8')
    expect(text).toContain('name: one-fact')
    expect(text).toContain('description: "the first, said better"')
    expect(text.endsWith('---\n\nfact edited\n')).toBe(true)
  })

  it('rewrites a bare note without inventing a fence', async () => {
    expect(await writeMemory(deps, 'two.md', 'edited\n', '')).toEqual({ ok: true, value: null })
    expect(await readFile(join(dir, 'two.md'), 'utf8')).toBe('edited\n')
  })

  it('will not write a note that does not exist', async () => {
    const put = await writeMemory(deps, 'new.md', 'made up', '')
    expect(put.ok).toBe(false)
  })

  it('removes a note and its index line together', async () => {
    expect(await removeMemory(deps, 'one.md')).toEqual({ ok: true, value: null })
    expect(await readFile(join(dir, 'MEMORY.md'), 'utf8')).toBe('- [Two](two.md) — bare\n')
    const listed = await listMemory(deps)
    expect(listed.ok && listed.value.map((entry) => entry.id)).toEqual(['two.md'])
  })

  it('answers an empty list for a project that never remembered', async () => {
    const cold = { ...deps, here: () => Promise.resolve('/work/other') }
    expect(await listMemory(cold)).toEqual({ ok: true, value: [] })
  })

  it('refuses to act with no project open', async () => {
    const closed = { ...deps, here: () => Promise.resolve(null) }
    const listed = await listMemory(closed)
    expect(listed.ok).toBe(false)
  })
})
