import { describe, expect, it } from 'vitest'
import { modelLabel } from './model-label'

describe('modelLabel', () => {
  it('긴 모델 아이디에서 사람이 부르는 이름만 남긴다', () => {
    expect(modelLabel('claude-opus-5')).toBe('Opus')
    expect(modelLabel('claude-sonnet-4-5-20250929')).toBe('Sonnet')
    expect(modelLabel('haiku')).toBe('Haiku')
  })

  it('모르는 아이디는 그대로 보여준다 — 못 알아봤다고 감추지 않는다', () => {
    expect(modelLabel('some-new-model')).toBe('some-new-model')
  })

  it('모르는 것은 그리지 않는다', () => {
    expect(modelLabel(null)).toBe(null)
    expect(modelLabel('  ')).toBe(null)
  })
})
