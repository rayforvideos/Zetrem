import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const LOCALES = join('src', 'shared', 'locales')

type Line = { id: string; said: string }

function catalog(tongue: string): Line[] {
  const po = readFileSync(join(LOCALES, tongue, 'messages.po'), 'utf8')
  const found: Line[] = []
  for (const [, id, said] of po.matchAll(/^msgid "((?:[^"\\]|\\.)*)"\nmsgstr "((?:[^"\\]|\\.)*)"/gm)) {
    if (id === undefined || id.length === 0) continue
    found.push({ id, said: said ?? '' })
  }
  return found
}

function slots(said: string): string[] {
  // ICU 복수형은 언어마다 형태 수가 다르다. 이름 있는 자리만 센다.
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
      execFileSync('npx', ['lingui', 'extract', '--clean'], { stdio: 'pipe' })
      const after = paths.map((path) => readFileSync(path, 'utf8'))
      const strip = (po: string): string => po.replace(/"POT-Creation-Date:[^"]*"\n/, '')
      expect(
        after.map(strip),
        '문구를 고쳤으면 npm run i18n:extract 로 카탈로그를 맞춰야 한다',
      ).toEqual(before.map(strip))
    } finally {
      paths.forEach((path, at) => writeFileSync(path, before[at] ?? ''))
    }
  })
})

describe('a line that has been translated is translated properly', () => {
  const done = KO.filter((one) => one.said.length > 0)

  it('has some Korean in it at all', () => {
    expect(done.length).toBeGreaterThan(50)
  })

  it('never leaves the English standing in for the Korean', () => {
    const copied = done.filter((one) => one.id === one.said)
    expect(copied.map((one) => one.id), '영어를 그대로 둔 줄은 번역하지 않은 것과 같다').toEqual([])
  })

  it('keeps every slot, or the name or number it carries goes missing', () => {
    const lost = done
      .filter((one) => slots(one.id).join() !== slots(one.said).join())
      .map((one) => one.id)
    expect(lost, '{0} 이나 {you} 를 잃으면 값이 사라진 문장이 나온다').toEqual([])
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
    expect(Number.isInteger(waiting), `아직 ${waiting}줄 남았다`).toBe(true)
  })
})
