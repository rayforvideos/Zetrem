import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const HANGUL = /[가-힣]/
const LOCALE = /toLocale(?:String|DateString|TimeString)\(\s*'([a-zA-Z-]+)'/g
const ENGLISH_LOCALES = new Set(['en-US', 'en-CA', 'en-GB'])

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((one) => {
    const path = join(dir, one.name)
    if (one.isDirectory()) return sources(path)
    if (!/\.tsx?$/.test(one.name) || one.name.includes('.test.')) return []
    return [path]
  })
}

const FILES = [...sources('src'), ...sources('electron')]

describe('the app speaks English, whatever language the conversation is in', () => {
  it('writes no Korean into anything that ships', () => {
    const found = FILES.filter((path) => {
      const body = readFileSync(path, 'utf8')
      return body
        .split('\n')
        .some((line) => HANGUL.test(line) && !line.includes('가-힣'))
    })
    expect(found, '제품 문구는 영어다. 한국어는 대화와 테스트에만 쓴다').toEqual([])
  })

  it('formats every number and date in an English locale', () => {
    const wrong: string[] = []
    for (const path of FILES) {
      for (const [, locale] of readFileSync(path, 'utf8').matchAll(LOCALE)) {
        if (locale !== undefined && !ENGLISH_LOCALES.has(locale)) wrong.push(`${path}: ${locale}`)
      }
    }
    expect(wrong, '한 곳만 다른 로케일이면 화면에서 자릿수가 어긋난다').toEqual([])
  })
})
