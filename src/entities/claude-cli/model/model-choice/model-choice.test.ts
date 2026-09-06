import { describe, expect, it } from 'vitest'
import { modelFromCli, NAMED_MODELS } from './model-choice'

describe('modelFromCli: which model a running session turned out to be on', () => {
  it('reads the family out of a dated build id', () => {
    expect(modelFromCli('claude-haiku-4-5-20251001')).toBe('haiku')
    expect(modelFromCli('claude-sonnet-4-5-20250929')).toBe('sonnet')
  })

  it('knows every model the app offers by name', () => {
    for (const name of NAMED_MODELS) {
      expect(modelFromCli(`claude-${name}-9-9-20260101`), name).toBe(name)
    }
  })

  it('says nothing rather than guess at an id it does not know', () => {
    expect(modelFromCli('unknown')).toBeNull()
    expect(modelFromCli('')).toBeNull()
  })
})
