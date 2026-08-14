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

describe('버튼은 하나다', () => {
  it('맨손 <button> 을 새로 만들지 않는다 — 포커스·비활성 규칙이 따라오지 않는다', async () => {
    const stray = (await ourFiles())
      .filter((file) => /<button[\s>]/.test(file.text))
      .map((file) => file.path)
    expect(stray, 'shared/ui/button 의 Button 을 쓴다').toEqual([])
  })

  it('CSS 로 만든 두 번째 버튼 체계는 없다', async () => {
    const css = await readFile(join('src', 'app', 'styles', 'global.css'), 'utf8')
    expect(css).not.toContain('.zt-btn')
  })
})
