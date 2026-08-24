import { describe, expect, it } from 'vitest'
import { SIDEBAR } from '@/shared/config/theme'
import { MODELS, PERMISSION_MODES } from '../choices/choices'
import { DEFAULT_SETTINGS, readSettings } from './settings'

describe('readSettings: reading back what was chosen', () => {
  it('starts on the defaults, with setup not yet finished', () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.setupDone).toBe(false)
    expect(DEFAULT_SETTINGS.permissionMode).toBe('ask')
  })

  it('brings a saved value back as it was', () => {
    const saved = {
      permissionMode: 'bypass',
      model: 'haiku',
      setupDone: true,
      onboarded: true,
      hintsSeen: ['hire-first'],
      knownTools: ['Read', 'Bash'],
      knownAgents: ['Explore', 'Ray'],
      stockAgents: ['Explore'],
      tongue: 'ko',
      theme: 'light',
      notify: false,
      enterSends: false,
      sidebarOpen: false,
      sidebarWidth: 300,
      refusedModels: ['fable'],
      userName: 'Ray',
      userFace: 'ghost',
    }
    expect(readSettings(saved)).toEqual(saved)
  })

  it('falls back to a default for a value it does not know, so a spoiled file cannot open the app in a strange mode', () => {
    const restored = readSettings({ permissionMode: '전부열기', model: 'gpt', setupDone: 'yes' })
    expect(restored.permissionMode).toBe('ask')
    expect(restored.model).toBe('default')
    expect(restored.setupDone).toBe(false)
  })

  it('fills the rest with defaults when only part was saved', () => {
    expect(readSettings({ model: 'opus' })).toEqual({ ...DEFAULT_SETTINGS, model: 'opus' })
  })
})

describe('the appearance setting', () => {
  it('starts dark until someone says otherwise', () => {
    expect(readSettings({}).theme).toBe('dark')
  })

  it('keeps a scheme that was picked by hand', () => {
    expect(readSettings({ theme: 'system' }).theme).toBe('system')
    expect(readSettings({ theme: 'light' }).theme).toBe('light')
  })

  it('goes back to dark when the saved word means nothing', () => {
    expect(readSettings({ theme: 'sepia' }).theme).toBe('dark')
    expect(readSettings({ theme: 3 }).theme).toBe('dark')
  })
})

describe('the lock setting', () => {
  it('drops anything in the remembered tool list that is not a name', () => {
    expect(readSettings({ knownTools: ['Read', 3, null, 'Bash'] }).knownTools).toEqual([
      'Read',
      'Bash',
    ])
  })
})

describe('what settings accept and what the app offers are one list', () => {
  it('saves every model it offers, because two lists means one goes stale', () => {
    for (const model of MODELS) {
      expect(readSettings({ model: model.id }).model, model.id).toBe(model.id)
    }
  })

  it('saves every permission mode it offers', () => {
    for (const mode of PERMISSION_MODES) {
      expect(readSettings({ permissionMode: mode.id }).permissionMode, mode.id).toBe(mode.id)
    }
  })
})

describe('the width of the board', () => {
  it('starts at the default width', () => {
    expect(readSettings({}).sidebarWidth).toBe(SIDEBAR.width)
  })

  it('pulls a saved width back into range, so a resized window does not open with the board eating the screen', () => {
    expect(readSettings({ sidebarWidth: 9999 }).sidebarWidth).toBe(SIDEBAR.max)
    expect(readSettings({ sidebarWidth: 1 }).sidebarWidth).toBe(SIDEBAR.min)
  })

  it('falls back to the default when the width is not a number', () => {
    expect(readSettings({ sidebarWidth: '넓게' }).sidebarWidth).toBe(SIDEBAR.width)
  })
})

describe('the built-in agent settings', () => {
  it('knows none and has none on until a session says otherwise', () => {
    expect(readSettings({}).knownAgents).toEqual([])
    expect(readSettings({}).stockAgents).toEqual([])
  })

  it('filters out anything that is not a name', () => {
    expect(readSettings({ knownAgents: ['Explore', 7, null] }).knownAgents).toEqual(['Explore'])
  })

  it('treats a non-list as none', () => {
    expect(readSettings({ stockAgents: 'Explore' }).stockAgents).toEqual([])
  })
})

describe('readSettings: models the account has already turned down', () => {
  it('remembers one that was refused, so it is not offered again as if it were fine', () => {
    expect(readSettings({ refusedModels: ['fable'] }).refusedModels).toEqual(['fable'])
  })

  it('starts with none, since nothing has been refused before anything is tried', () => {
    expect(readSettings({}).refusedModels).toEqual([])
  })

  it('drops a name it does not offer, so a spoiled file cannot grey out something real', () => {
    expect(readSettings({ refusedModels: ['fable', 'gpt-9', 7] }).refusedModels).toEqual(['fable'])
  })
})

describe('who the person is, kept beside how they like to work', () => {
  it('keeps the name they gave, tidied', () => {
    expect(readSettings({ userName: '  Ray  Kim ' }).userName).toBe('Ray Kim')
  })

  it('starts with no name rather than inventing one', () => {
    expect(readSettings({}).userName).toBe('')
  })

  it('keeps a face it knows and falls back for one it does not', () => {
    expect(readSettings({ userFace: 'capsule' }).userFace).toBe('capsule')
    expect(readSettings({ userFace: 'heart' }).userFace).toBe('onigiri')
    expect(readSettings({}).userFace).toBe('onigiri')
  })
})

describe('being told when the work is done', () => {
  it('is on to begin with, since that is why you leave the window', () => {
    expect(readSettings(null).notify).toBe(true)
  })

  it('stays off once it has been turned off', () => {
    expect(readSettings({ notify: false }).notify).toBe(false)
  })

  it('reads anything that is not a plain false as on', () => {
    expect(readSettings({ notify: 'yes' }).notify).toBe(true)
    expect(readSettings({}).notify).toBe(true)
  })
})

describe('which language the app speaks', () => {
  it('follows the machine until told otherwise', () => {
    expect(readSettings(null).tongue).toBe('system')
  })

  it('keeps a language that was chosen by hand', () => {
    expect(readSettings({ tongue: 'ko' }).tongue).toBe('ko')
    expect(readSettings({ tongue: 'en' }).tongue).toBe('en')
  })

  it('falls back to following the machine for a language it does not speak', () => {
    expect(readSettings({ tongue: 'ja' }).tongue).toBe('system')
    expect(readSettings({ tongue: 7 }).tongue).toBe('system')
  })
})
