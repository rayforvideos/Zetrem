import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

// A teammate works in a checkout of this repository under .claude/worktrees/,
// made by the session it runs in and removed once its branch is merged. While
// it is there it is a second copy of every file in the project, and Biome
// reads .gitignore: without the line, a lint run in the main checkout walks
// into each teammate's copy and reports the same file once per teammate out.
describe('the teammate worktrees are left out of what walks the project', () => {
  async function ignoreLines(): Promise<string[]> {
    return (await readFile('.gitignore', 'utf8')).split('\n').map((line) => line.trim())
  }

  it('names .claude/worktrees/ in the ignore file', async () => {
    expect(await ignoreLines()).toContain('.claude/worktrees/')
  })

  it('leaves the rest of .claude alone, since the project keeps its own there', async () => {
    const lines = await ignoreLines()
    expect(lines).not.toContain('.claude')
    expect(lines).not.toContain('.claude/')
  })

  it('is read at all, which Biome only does with the vcs setting on', async () => {
    expect(await readFile('biome.jsonc', 'utf8')).toContain('"useIgnoreFile": true')
  })
})
