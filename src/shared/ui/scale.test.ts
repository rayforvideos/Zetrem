import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const OURS = ['entities', 'pages', 'widgets', 'app']

const OUR_SHARED_UI = ['agent-face.tsx', 'wordmark.tsx', 'tool-icon.tsx']

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
  for (const name of OUR_SHARED_UI) {
    const full = join('src', 'shared', 'ui', name)
    out.push({ path: full, text: await readFile(full, 'utf8') })
  }
  return out
}

describe('눈금은 shadcn 이 쥔다 — 우리가 칸을 새로 파지 않는다', () => {
  it('임의 픽셀 글자 크기를 쓰지 않는다 — Tailwind 스케일을 쓴다', async () => {
    const stray: string[] = []
    for (const file of await ourFiles()) {
      for (const match of file.text.matchAll(/text-\[[0-9.]+(?:px|rem)\]/g)) {
        stray.push(`${file.path}: ${match[0]}`)
      }
    }
    expect(stray, 'text-xs · text-sm · text-base 를 쓴다').toEqual([])
  })

  it('밝기를 손으로 깎지 않는다 — 색은 시맨틱 토큰이 정한다', async () => {
    const stray: string[] = []
    for (const file of await ourFiles()) {
      if (file.path.includes('agent-face')) continue
      for (const match of file.text.matchAll(/(?:^|[\s"'`])(opacity-\d+)(?=[\s"'`]|$)/g)) {
        stray.push(`${file.path}: ${match[1]}`)
      }
    }
    expect(stray, 'text-muted-foreground 처럼 뜻이 있는 토큰을 쓴다').toEqual([])
  })

  it('색을 직접 들이지 않는다 — 얼굴 말고는 무채색이다', async () => {
    const PALETTE =
      /(?:^|[\s"'`:])(?:bg|text|border|ring|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/g
    const stray: string[] = []
    for (const file of await ourFiles()) {
      if (file.path.includes('agent-face')) continue
      for (const match of file.text.matchAll(PALETTE)) stray.push(`${file.path}: ${match[0].trim()}`)
    }
    expect(stray, '색은 에이전트 얼굴에만 있다').toEqual([])
  })
})
