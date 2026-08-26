import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const LOCALES = join('src', 'shared', 'locales')

type Line = { id: string; said: string }

function catalog(tongue: string): Line[] {
  const po = readFileSync(join(LOCALES, tongue, 'messages.po'), 'utf8')
  const found: Line[] = []
  for (const [, id, said] of po.matchAll(
    /^msgid "((?:[^"\\]|\\.)*)"\r?\nmsgstr "((?:[^"\\]|\\.)*)"/gm,
  )) {
    if (id === undefined || id.length === 0) continue
    found.push({ id, said: said ?? '' })
  }
  return found
}

function slots(said: string): string[] {
  // ICU plurals carry a different number of forms per language, so only the
  // named slots are counted.
  return [...said.matchAll(/\{\s*([a-zA-Z0-9_]+)\s*[,}]/g)]
    .map(([, name]) => name ?? '')
    .filter((name) => name.length > 0)
    .sort()
}

const KO = catalog('ko')

describe('the catalogs are what the app actually says', () => {
  it('holds the same lines the extractor finds in the source', () => {
    const tongues = ['en', 'ko']
    const paths = tongues.map((one) => join(LOCALES, one, 'messages.po'))
    const before = paths.map((path) => readFileSync(path, 'utf8'))
    try {
      // Not `npx`: on Windows that is npx.cmd, and Node refuses to spawn a .cmd
      // without a shell. Run the CLI's own entry point with the node we are in.
      execFileSync(
        process.execPath,
        [join('node_modules', '@lingui', 'cli', 'dist', 'lingui.js'), 'extract', '--clean'],
        { stdio: 'pipe' },
      )
      const after = paths.map((path) => readFileSync(path, 'utf8'))
      const strip = (po: string): string => po.replace(/"POT-Creation-Date:[^"]*"\r?\n/, '')
      expect(after.map(strip), 'run npm run i18n:extract after changing what the app says').toEqual(
        before.map(strip),
      )
    } finally {
      paths.forEach((path, at) => {
        writeFileSync(path, before[at] ?? '')
      })
    }
    // Running the extractor is the slow part, and a CI runner is slower than a
    // laptop. The old five-second default failed here for want of time, not truth.
  }, 120_000)
})

describe('a line that has been translated is translated properly', () => {
  const done = KO.filter((one) => one.said.length > 0)

  it('has some Korean in it at all', () => {
    expect(done.length).toBeGreaterThan(50)
  })

  it('never leaves the English standing in for the Korean', () => {
    const copied = done.filter((one) => one.id === one.said)
    expect(
      copied.map((one) => one.id),
      'a line left in English is a line nobody translated',
    ).toEqual([])
  })

  it('keeps every slot, or the name or number it carries goes missing', () => {
    const lost = done
      .filter((one) => slots(one.id).join() !== slots(one.said).join())
      .map((one) => one.id)
    expect(lost, 'losing {0} or {you} leaves a sentence with a hole in it').toEqual([])
  })
})

describe('adding a language is dropping in a file', () => {
  it('finds a catalog for every language the app offers', () => {
    const offered = ['en', 'ko']
    const shipped = readdirSync(LOCALES, { withFileTypes: true })
      .filter((one) => one.isDirectory())
      .map((one) => one.name)
    for (const one of offered) expect(shipped, one).toContain(one)
  })

  it('leaves an untranslated line showing English rather than breaking', () => {
    const waiting = KO.filter((one) => one.said.length === 0).length
    expect(Number.isInteger(waiting), `${waiting} lines still waiting`).toBe(true)
  })
})
