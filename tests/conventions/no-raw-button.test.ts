import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const OURS = ['entities', 'pages', 'widgets']

async function ourFiles(): Promise<{ path: string; text: string }[]> {
  const out: { path: string; text: string }[] = []
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
        out.push({ path: full, text: await readFile(full, 'utf8') })
      }
    }
  }
  for (const dir of OURS) await walk(join('src', dir))
  return out
}

describe('there is one button', () => {
  it('writes no bare button, which would come without the focus and disabled rules', async () => {
    const stray = (await ourFiles())
      .filter((file) => /<button[\s>]/.test(file.text))
      .map((file) => file.path)
    expect(stray, 'use the Button from shared/ui/button').toEqual([])
  })

  it('keeps no second button system built out of CSS', async () => {
    const css = await readFile(join('src', 'app', 'styles', 'global.css'), 'utf8')
    expect(css).not.toContain('.zt-btn')
  })
})
