import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SPRITE_SURFACES = ['CharacterPicker', 'AgentSprite', 'YouField']

const REVEALED_ON_HOVER = ['MemberMenu', 'ChatList', 'ProjectSwitcher']

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
    expect(stray, 'use the type scale: text-xs, text-sm, text-base').toEqual([])
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
    expect(stray, 'use a token that means something, like text-muted-foreground').toEqual([])
  })

  it('brings in no colour of its own, since only the faces have any', async () => {
    const PALETTE =
      /(?:^|[\s"'`:])(?:bg|text|border|ring|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/g
    const stray: string[] = []
    for (const file of await ourFiles()) {
      if (file.path.includes('agent-face')) continue
      for (const match of file.text.matchAll(PALETTE))
        stray.push(`${file.path}: ${match[0].trim()}`)
    }
    expect(stray, 'colour belongs to the agent faces and nowhere else').toEqual([])
  })
})

describe('the one colour that is not a face', () => {
  it('gives the Claude mark its own token rather than a hex written in place', async () => {
    const css = await readFile(join('src', 'app', 'styles', 'global.css'), 'utf8')
    expect(css, "Claude's own colour is kept under a name").toContain('--claude: #d97757')
    expect(css).toContain('--color-claude: var(--claude)')
  })

  it('spends that token on the mark alone, and nowhere else', async () => {
    const worn: string[] = []
    for (const file of await ourFiles()) {
      if (file.text.includes('text-claude') || file.text.includes('bg-claude')) worn.push(file.path)
    }
    expect(worn, 'a brand colour is for naming that brand, nothing else').toEqual([
      join('src', 'widgets', 'status-bar', 'ui', 'UsageBar', 'UsageBar.tsx'),
    ])
  })
})

describe('the ring that says where the keyboard is', () => {
  async function shadcnFiles(): Promise<{ path: string; text: string }[]> {
    const dir = join('src', 'shared', 'ui')
    const names = (await readdir(dir)).filter((name) => name.endsWith('.tsx'))
    return Promise.all(
      names.map(async (name) => ({ path: name, text: await readFile(join(dir, name), 'utf8') })),
    )
  }

  it('draws it two pixels thick, which is thin enough to sit close to a small control', async () => {
    const stray: string[] = []
    for (const file of await shadcnFiles()) {
      for (const match of file.text.matchAll(/focus-visible:ring-\[(\d+)px\]/g)) {
        stray.push(`${file.path}: ${match[0]}`)
      }
      for (const match of file.text.matchAll(/focus-visible:ring-(\d+)(?![\w/-])/g)) {
        if (match[1] !== '2' && match[1] !== '0') stray.push(`${file.path}: ${match[0]}`)
      }
    }
    expect(stray, 'a hairline is a hairline everywhere').toEqual([])
  })

  it('keeps it solid enough to clear the readable mark, since a thin ring cannot be faint too', async () => {
    const stray: string[] = []
    for (const file of await shadcnFiles()) {
      for (const match of file.text.matchAll(/focus-visible:ring-ring\/(\d+)/g)) {
        if (Number(match[1]) < 70) stray.push(`${file.path}: ${match[0]}`)
      }
    }
    expect(stray, '50% came to 2.18:1 on a card, under the floor').toEqual([])
  })

  it('does not colour the border as well, which drew a second line around the first', async () => {
    const stray: string[] = []
    for (const file of await shadcnFiles()) {
      if (file.text.includes('focus-visible:border-ring')) stray.push(file.path)
    }
    expect(stray).toEqual([])
  })
})
