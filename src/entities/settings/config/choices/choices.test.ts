import { describe, expect, it } from 'vitest'
import { MODELS, PERMISSION_MODES } from './choices'
import { readSettings } from '../../model/settings/settings'

describe('the ids the settings accept are the ones the pickers offer', () => {
  it('offers every permission mode the settings will keep', () => {
    for (const mode of PERMISSION_MODES) {
      expect(readSettings({ permissionMode: mode.id }).permissionMode, mode.id).toBe(mode.id)
    }
  })

  it('offers every model the settings will keep', () => {
    for (const model of MODELS) {
      expect(readSettings({ model: model.id }).model, model.id).toBe(model.id)
    }
  })

  it('has as many of each as the settings know about', () => {
    expect(PERMISSION_MODES).toHaveLength(4)
    expect(MODELS).toHaveLength(5)
  })
})

describe('every choice says what it sets', () => {
  it('gives every choice a label and a hint, since a name alone does not say what it sets', () => {
    for (const choice of [...PERMISSION_MODES, ...MODELS]) {
      const label = typeof choice.label === 'string' ? choice.label : (choice.label.message ?? '')
      expect(label.length).toBeGreaterThan(0)
      expect(choice.hint.message?.length ?? 0, label).toBeGreaterThan(0)
    }
  })
})
