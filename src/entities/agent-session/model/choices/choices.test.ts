import { describe, expect, it } from 'vitest'
import { MODELS, PERMISSION_MODES } from './choices'
import { readSettings } from '../settings/settings'

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
    expect(PERMISSION_MODES).toHaveLength(3)
    expect(MODELS).toHaveLength(5)
  })
})
