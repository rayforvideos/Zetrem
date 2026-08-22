import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = [join('src'), join('electron')]
const SHOWS_A_MARK = /\bfocus:(ring|outline|border|underline|shadow)/

async function styledFiles(): Promise<{ path: string; text: string }[]> {
  const out: { path: string; text: string }[] = []
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      if (!/\.(tsx|css)$/.test(entry.name)) continue
      out.push({ path: full, text: await readFile(full, 'utf8') })
    }
  }
  for (const dir of ROOTS) await walk(dir)
  return out
}

describe('the focus mark belongs to the keyboard', () => {
  it('never draws it on plain focus, which a mouse press also gives', async () => {
    const guilty = (await styledFiles())
      .filter((file) => SHOWS_A_MARK.test(file.text))
      .map((file) => file.path)
    expect(guilty, 'use focus-visible:, since focus: also fires on a mouse press').toEqual([])
  })

  it('does draw it on focus-visible, so tabbing is never invisible', async () => {
    const button = await readFile(join('src', 'shared', 'ui', 'button.tsx'), 'utf8')
    expect(button).toContain('focus-visible:ring-2')
  })

  it('does not turn the ring off for the quiet buttons, whose icons have no text to underline', async () => {
    const button = await readFile(join('src', 'shared', 'ui', 'button.tsx'), 'utf8')
    const quiet = button.slice(button.indexOf('quiet:'), button.indexOf('quiet:') + 260)
    expect(quiet, 'a quiet icon button with no ring shows nothing when tabbed to').not.toContain(
      'focus-visible:ring-0',
    )
  })
})
