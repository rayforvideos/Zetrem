import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SIZES = new Set(['10.5', '11', '12.5', '14', '15', '16'])
const OPACITIES = new Set(['0', '15', '30', '45', '70', '100'])

const OURS = ['entities', 'pages', 'widgets', 'app']

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
  await walk(join('src', 'shared', 'ui'))
  return out
}

describe('눈금 — 크기와 밝기는 정해진 칸에만 선다', () => {
  it('글자 크기는 여섯 칸뿐이다', async () => {
    const stray: string[] = []
    for (const file of await ourFiles()) {
      for (const match of file.text.matchAll(/text-\[([0-9.]+)px\]/g)) {
        if (!SIZES.has(match[1] as string)) stray.push(`${file.path}: ${match[0]}`)
      }
    }
    expect(stray, '눈금 밖의 글자 크기').toEqual([])
  })

  it('밝기는 다섯 칸뿐이다 — shadcn 기본 클래스는 우리 것이 아니다', async () => {
    const stray: string[] = []
    for (const file of await ourFiles()) {
      if (file.path.includes('shared/ui/') && !file.path.includes('agent-face')) continue
      for (const match of file.text.matchAll(/(?:^|[\s"'`:])opacity-(\d+)(?=[\s"'`]|$)/g)) {
        if (!OPACITIES.has(match[1] as string)) stray.push(`${file.path}: opacity-${match[1]}`)
      }
    }
    expect(stray, '눈금 밖의 밝기').toEqual([])
  })
})
