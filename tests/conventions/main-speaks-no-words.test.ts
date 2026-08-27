import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function resolveImport(spec: string, from: string): string | null {
  const base = spec.startsWith('@/')
    ? join(ROOT, 'src', spec.slice(2))
    : resolve(dirname(from), spec)
  for (const one of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(one)) return one
  }
  return null
}

// The main process has no babel, so the Lingui macros never compile there: a t`…`
// that rides in through a barrel import crashes the app at launch.
function macroReach(entries: string[]): string[] {
  const seen = new Set<string>()
  const caught: string[] = []

  function walk(file: string, chain: string[]): void {
    if (seen.has(file)) return
    seen.add(file)
    const body = readFileSync(file, 'utf8')
    if (body.includes('@lingui/core/macro') || body.includes('@lingui/react/macro')) {
      caught.push([...chain, file].map((one) => one.replace(`${ROOT}/`, '')).join(' → '))
      return
    }
    for (const [, spec] of body.matchAll(/from\s+'([^']+)'/g)) {
      if (spec === undefined || (!spec.startsWith('.') && !spec.startsWith('@/'))) continue
      const next = resolveImport(spec, file)
      if (next !== null) walk(next, [...chain, file])
    }
  }

  for (const entry of entries) walk(entry, [])
  return caught
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((one) => {
    const path = join(dir, one.name)
    if (one.isDirectory()) return sources(path)
    return path.endsWith('.ts') && !path.includes('.test.') ? [path] : []
  })
}

describe('the main process says nothing a person reads', () => {
  it('never reaches a module that uses the Lingui macro', () => {
    const found = macroReach(sources(join(ROOT, 'electron')))
    expect(
      found,
      'the main process cannot compile the macro. Import the module itself, not the barrel',
    ).toEqual([])
  })

  it('is a guard that can actually see through a barrel', () => {
    const speaking = sources(join(ROOT, 'src', 'widgets'))
    expect(macroReach(speaking).length).toBeGreaterThan(0)
  })
})

describe('the guard is looking at real files', () => {
  it('finds the main entry', () => {
    expect(statSync(join(ROOT, 'electron', 'main.ts')).isFile()).toBe(true)
  })
})
