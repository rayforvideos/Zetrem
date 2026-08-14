import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SPRITE_SURFACES = ['CharacterPicker', 'AgentSprite']

const REVEALED_ON_HOVER = ['MemberMenu', 'ChatList']

const OURS = [
  join('src', 'entities'),
  join('src', 'pages'),
  join('src', 'widgets'),
  join('src', 'app'),
  join('src', 'shared', 'graphics'),
]

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
  for (const dir of OURS) await walk(dir)
  return out
}

describe('shadcn holds the ruler, and we do not cut new notches', () => {
  it('uses the Tailwind scale instead of a pixel size of its own', async () => {
    const stray: string[] = []
    for (const file of await ourFiles()) {
      for (const match of file.text.matchAll(/text-\[[0-9.]+(?:px|rem)\]/g)) {
        stray.push(`${file.path}: ${match[0]}`)
      }
    }
    expect(stray, 'text-xs · text-sm · text-base 를 쓴다').toEqual([])
  })

  it('does not carve brightness by hand, and lets the tokens set colour', async () => {
    const stray: string[] = []
    for (const file of await ourFiles()) {
      if (file.path.includes('agent-face')) continue
      if (SPRITE_SURFACES.some((name) => file.path.includes(name))) continue
      if (REVEALED_ON_HOVER.some((name) => file.path.includes(name))) continue
      for (const match of file.text.matchAll(/(?:^|[\s"'`])(opacity-\d+)(?=[\s"'`]|$)/g)) {
        stray.push(`${file.path}: ${match[1]}`)
      }
    }
    expect(stray, 'text-muted-foreground 처럼 뜻이 있는 토큰을 쓴다').toEqual([])
  })

  it('brings in no colour of its own, since only the faces have any', async () => {
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
