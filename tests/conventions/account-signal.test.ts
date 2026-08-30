import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@babel/parser'
import { describe, expect, it } from 'vitest'

const USE_AUTH = join('src', 'pages', 'workspace', 'model', 'account', 'useAuth.ts')

// Everything on screen was worked out for the account that was signed in a
// moment ago, and accountChanged() is the one thing that says so. Nothing else
// in the app fails when it goes missing from a branch, so this does: every
// place useAuth reads an Outcome the main process handed back is a place an
// account may have just moved. Reading `.ok` off the answer is what marks such
// a place — the name the answer was given is nobody's business.
function branchesWithoutTheSignal(body: string): number[] {
  const file = parse(body, { sourceType: 'module', plugins: ['typescript'] })
  const missing: number[] = []

  function anywhere(node: unknown, found: (shape: Record<string, unknown>) => boolean): boolean {
    if (node === null || typeof node !== 'object') return false
    if (Array.isArray(node)) return node.some((one) => anywhere(one, found))
    const shape = node as Record<string, unknown>
    if (found(shape)) return true
    return Object.entries(shape).some(([key, value]) => key !== 'loc' && anywhere(value, found))
  }

  function raisesIt(node: unknown): boolean {
    return anywhere(node, (shape) => {
      if (shape.type !== 'CallExpression') return false
      const callee = shape.callee as { type: string; name?: string }
      return callee.type === 'Identifier' && callee.name === 'accountChanged'
    })
  }

  function readsTheOutcome(node: unknown, name: string): boolean {
    return anywhere(node, (shape) => {
      if (shape.type !== 'MemberExpression' || shape.computed === true) return false
      const object = shape.object as { type: string; name?: string }
      const property = shape.property as { type: string; name?: string }
      return object.type === 'Identifier' && object.name === name && property.name === 'ok'
    })
  }

  function walk(node: unknown): void {
    if (node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const one of node) walk(one)
      return
    }
    const shape = node as {
      type?: string
      params?: { type: string; name?: string }[]
      loc?: { start: { line: number } }
    }
    if (shape.type === 'ArrowFunctionExpression') {
      const only = shape.params?.length === 1 ? shape.params[0] : undefined
      const name = only?.type === 'Identifier' ? only.name : undefined
      if (name !== undefined && readsTheOutcome(node, name) && !raisesIt(node)) {
        missing.push(shape.loc?.start.line ?? 0)
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
      walk(value)
    }
  }

  walk(file)
  return missing
}

const useAuth = (): string => readFileSync(USE_AUTH, 'utf8')

describe('an account that has moved is announced once, wherever it moved', () => {
  it('raises the signal in every branch of useAuth that took an outcome back', () => {
    const missing = branchesWithoutTheSignal(useAuth())
    expect(
      missing,
      'call accountChanged() here: the limits, the session, the tools and the connectors all still describe the account that has gone',
    ).toEqual([])
  })

  it('is a guard that can see the call go missing', () => {
    expect(
      branchesWithoutTheSignal(useAuth().replace('accountChanged()', 'undefined')),
    ).toHaveLength(1)
  })

  it('still sees it go missing when the answer has been given another name', () => {
    const renamed = useAuth().replaceAll('result', 'answer')
    expect(branchesWithoutTheSignal(renamed.replace('accountChanged()', 'undefined'))).toHaveLength(
      1,
    )
  })

  it('says nothing about a branch that never read an outcome at all', () => {
    const unrelated = `${useAuth()}
function elsewhere(): void {
  void Promise.resolve().catch((result: unknown) => console.error(result))
}
`
    expect(branchesWithoutTheSignal(unrelated)).toEqual([])
  })
})
