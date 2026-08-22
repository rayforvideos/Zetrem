import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@babel/parser'
import { describe, expect, it } from 'vitest'

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((one) => {
    const path = join(dir, one.name)
    if (one.isDirectory()) return sources(path)
    if (!/\.tsx?$/.test(one.name) || one.name.includes('.test.')) return []
    return [path]
  })
}

const OPENS = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
])

// t`…` reads the catalog the moment it runs. Outside any function that moment is
// import time, before a locale is up: the app throws on launch, and if it survives
// the words are frozen in whatever language happened to load first. Module-level
// wording belongs in msg`…`, read later with i18n._().
export function frozenWords(body: string): number[] {
  const file = parse(body, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
  const found: number[] = []

  function walk(node: unknown, inside: boolean): void {
    if (node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const one of node) walk(one, inside)
      return
    }
    const kind = (node as { type?: string }).type
    if (kind === undefined) return
    if (!inside && kind === 'TaggedTemplateExpression') {
      const tag = (node as { tag: { type: string; name?: string } }).tag
      if (tag.type === 'Identifier' && tag.name === 't') {
        found.push((node as { loc?: { start: { line: number } } }).loc?.start.line ?? 0)
      }
    }
    const deeper = inside || OPENS.has(kind)
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
      walk(value, deeper)
    }
  }

  walk(file.program.body, false)
  return found
}

describe('words are read when they are said, not when the file loads', () => {
  it('never calls the t macro outside a function', () => {
    const caught: string[] = []
    for (const path of [...sources('src'), ...sources('electron')]) {
      for (const line of frozenWords(readFileSync(path, 'utf8'))) caught.push(`${path}:${line}`)
    }
    expect(
      caught,
      'a t`…` at module top level runs before the catalogs do. Hold it as msg`…` and read it with i18n._()',
    ).toEqual([])
  })

  it('is a guard that actually fires', () => {
    expect(frozenWords('const SAID = { a: t`Hello` }')).toEqual([1])
    expect(frozenWords('const SAID = { a: msg`Hello` }')).toEqual([])
    expect(frozenWords('function say() {\n  return t`Hello`\n}')).toEqual([])
    expect(frozenWords('const Row = () => <p>{t`Hello`}</p>')).toEqual([])
  })
})
