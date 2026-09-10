import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SPRITE_SURFACES = ['CharacterPicker', 'AgentSprite', 'YouField']

const REVEALED_ON_HOVER = [
  'MemberMenu',
  'ChatList',
  'ProjectSwitcher',
  'NoteList',
  'ConversationPane',
]

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
      join('src', 'widgets', 'setup', 'ui', 'AccountField', 'AccountField.tsx'),
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

// The toast is lifted off the composer by a constant rather than a measurement,
// which only holds while the constant still describes the composer. These pin
// the classes the numbers in COMPOSER were read off, so a change to one side
// fails here instead of quietly putting a toast back over the send button.
describe('the composer keeps the shape the toast was lifted over', () => {
  it('still grows to the ceiling COMPOSER.field names', async () => {
    const composer = await readFile(
      join('src', 'widgets', 'conversation', 'ui', 'Composer', 'Composer.tsx'),
      'utf8',
    )
    expect(composer, 'COMPOSER.field is max-h-40 in pixels').toContain('max-h-40')
    expect(composer, 'COMPOSER.pad is the InputGroup p-1.5').toContain('p-1.5 shadow-none')
    expect(composer, 'COMPOSER.controls stands an icon-sm button').toContain('size="icon-sm"')
  })

  it('still hangs its file row above the field', async () => {
    const row = await readFile(
      join('src', 'widgets', 'conversation', 'ui', 'Composer', 'AttachedRow.tsx'),
      'utf8',
    )
    expect(row, 'COMPOSER.attached is pt-1.5 over a py-1 chip around a size-7 thumb').toContain(
      'px-1.5 pt-1.5',
    )
    expect(row).toContain('size-7')
  })
})
