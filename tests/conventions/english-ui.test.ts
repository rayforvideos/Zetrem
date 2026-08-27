import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const HANGUL = /[가-힣]/
const LOCALE = /toLocale(?:String|DateString|TimeString)\(\s*'([a-zA-Z-]+)'/g
const ENGLISH_LOCALES = new Set(['en-US', 'en-CA', 'en-GB'])
const BOOK = join('src', 'shared', 'lib', 'say')
const VAULT_CONTENT = new Set([
  join('electron', 'vault', 'vault.ts'),
  join('electron', 'vault', 'vault-folders.ts'),
])

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((one) => {
    const path = join(dir, one.name)
    if (one.isDirectory()) return sources(path)
    if (!/\.tsx?$/.test(one.name) || one.name.includes('.test.')) return []
    return [path]
  })
}

const FILES = [...sources('src'), ...sources('electron')]

describe('Korean lives in the dictionary, not scattered through the app', () => {
  it('keeps Hangul out of every file but the book and the vault guide', () => {
    const found = FILES.filter((path) => {
      if (path.startsWith(BOOK) || VAULT_CONTENT.has(path)) return false
      const body = readFileSync(path, 'utf8')
      return body
        .split('\n')
        .some((line) => HANGUL.test(line) && !line.includes('가-힣') && !line.includes("'한국어'"))
    })
    expect(
      found,
      'Korean lives in the catalogs and the vault guide; scattered, nobody knows which line is real',
    ).toEqual([])
  })

  it('writes the English line, never a key nobody can read', () => {
    const invented = FILES.flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/\bt\('([a-z]+(?:[._][a-z]+)+)'\)/g)].map(
        ([, key]) => `${path}: ${key}`,
      ),
    )
    expect(invented, "no invented keys like t('sidebar.builtins')").toEqual([])
  })
})

describe('numbers and dates follow the language being spoken', () => {
  it('hardcodes no locale but the English default', () => {
    const wrong: string[] = []
    for (const path of FILES) {
      if (path.startsWith(BOOK)) continue
      for (const [, locale] of readFileSync(path, 'utf8').matchAll(LOCALE)) {
        if (locale !== undefined && !ENGLISH_LOCALES.has(locale)) wrong.push(`${path}: ${locale}`)
      }
    }
    expect(wrong, "the locale is say's to decide").toEqual([])
  })
})
