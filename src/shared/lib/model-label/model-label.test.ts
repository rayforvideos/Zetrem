import { describe, expect, it } from 'vitest'
import { modelLabel } from './model-label'

describe('modelLabel', () => {
  it('keeps only the name people say out of a long model id', () => {
    expect(modelLabel('claude-opus-5')).toBe('Opus')
    expect(modelLabel('claude-sonnet-4-5-20250929')).toBe('Sonnet')
    expect(modelLabel('haiku')).toBe('Haiku')
  })

  it('shows an id it does not recognise, rather than hiding it', () => {
    expect(modelLabel('some-new-model')).toBe('some-new-model')
  })

  it('draws nothing when there is nothing to draw', () => {
    expect(modelLabel(null)).toBe(null)
    expect(modelLabel('  ')).toBe(null)
  })
})
