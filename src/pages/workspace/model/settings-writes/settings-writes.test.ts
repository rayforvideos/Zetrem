import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/entities/agent-session'
import { onRead, onUpdate } from './settings-writes'

const saved = {
  ...DEFAULT_SETTINGS,
  permissionMode: 'bypass' as const,
  userName: 'Ray',
  setupDone: true,
}

describe('nothing is written before what is on disk has been read', () => {
  it('holds a change made while the file is still being read', () => {
    const held = onUpdate(DEFAULT_SETTINGS, { knownTools: ['Bash'] }, false, {})
    expect(held.save).toBe(false)
    expect(held.waiting).toEqual({ knownTools: ['Bash'] })
  })

  it('lays the held change over what was read, and keeps the rest', () => {
    const { next, save } = onRead(saved, { knownTools: ['Bash'] })
    expect(save).toBe(true)
    expect(next.knownTools).toEqual(['Bash'])
    expect(next.permissionMode).toBe('bypass')
    expect(next.userName).toBe('Ray')
    expect(next.setupDone).toBe(true)
  })

  it('writes nothing on a read that nobody was waiting on', () => {
    expect(onRead(saved, {}).save).toBe(false)
  })

  it('saves at once once the file has been read', () => {
    const held = onUpdate(saved, { model: 'opus' }, true, {})
    expect(held.save).toBe(true)
    expect(held.next.model).toBe('opus')
    expect(held.waiting).toEqual({})
  })

  it('gathers every change made during the wait, not only the last', () => {
    const first = onUpdate(DEFAULT_SETTINGS, { knownTools: ['Bash'] }, false, {})
    const second = onUpdate(first.next, { knownAgents: ['Joi'] }, false, first.waiting)
    expect(second.waiting).toEqual({ knownTools: ['Bash'], knownAgents: ['Joi'] })
  })
})
