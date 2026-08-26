import { describe, expect, it } from 'vitest'
import { lost, textOf, whyOf, won } from './outcome'

describe('an outcome', () => {
  it('carries the value when it worked', () => {
    const one = won('done')
    expect(one).toEqual({ ok: true, value: 'done' })
    expect(textOf(one)).toBe('done')
    expect(whyOf(one)).toBeNull()
  })

  it('carries the kind and the evidence when it did not', () => {
    const one = lost<string>('cli', 'exit 1')
    expect(one).toEqual({ ok: false, why: { code: 'cli', said: 'exit 1' } })
    expect(textOf(one)).toBe('exit 1')
    expect(whyOf(one)).toEqual({ code: 'cli', said: 'exit 1' })
  })

  it('needs no evidence for a refusal that speaks for itself', () => {
    expect(lost('garbled')).toEqual({ ok: false, why: { code: 'garbled', said: '' } })
  })
})
