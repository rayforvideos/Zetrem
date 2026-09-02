import { describe, expect, it } from 'vitest'
import { maySave, mustKeepOnLeave, threadLearned, threadToSave } from './may-save'

const ready = {
  ready: true,
  project: '/a',
  loadedFor: '/a',
  openId: 'chat-1',
  status: 'done' as const,
  turnCount: 3,
}

describe('mustKeepOnLeave: leaving a chat writes it back first, even mid-turn', () => {
  const leaving = { project: '/a', loadedFor: '/a', openId: 'chat-1', turnCount: 2 }

  it('keeps a chat with turns, whatever its status', () => {
    expect(mustKeepOnLeave(leaving)).toBe(true)
  })

  it('has nothing to keep for an empty chat or none open', () => {
    expect(mustKeepOnLeave({ ...leaving, turnCount: 0 })).toBe(false)
    expect(mustKeepOnLeave({ ...leaving, openId: null })).toBe(false)
  })

  it('never writes turns into a project they were not loaded for', () => {
    expect(mustKeepOnLeave({ ...leaving, loadedFor: '/b' })).toBe(false)
    expect(mustKeepOnLeave({ ...leaving, loadedFor: null })).toBe(false)
  })
})

describe('maySave: a chat is only ever written back to the project it came from', () => {
  it('saves a settled chat of the project it was loaded for', () => {
    expect(maySave(ready)).toBe(true)
  })

  it('refuses the moment the project changes, before the new one has loaded', () => {
    expect(maySave({ ...ready, project: '/b' })).toBe(false)
  })

  it('refuses again once the new project is loaded but the old turns are still on screen', () => {
    expect(maySave({ ...ready, project: '/b', loadedFor: null })).toBe(false)
  })

  it('saves once the new project has finished loading its own chat', () => {
    expect(maySave({ ...ready, project: '/b', loadedFor: '/b' })).toBe(true)
  })

  it('waits while a turn is still running', () => {
    expect(maySave({ ...ready, status: 'working' })).toBe(false)
  })

  it('has nothing to save for an empty chat', () => {
    expect(maySave({ ...ready, turnCount: 0 })).toBe(false)
  })

  it('waits until the screen is ready and has a chat open', () => {
    expect(maySave({ ...ready, ready: false })).toBe(false)
    expect(maySave({ ...ready, openId: null })).toBe(false)
    expect(maySave({ ...ready, project: null })).toBe(false)
  })
})

describe('threadToSave: which session a chat should be picked back up from', () => {
  it('keeps the live session once a real run has one', () => {
    expect(threadToSave({ liveSessionId: 'live', probed: false, resumeId: 'old' })).toBe('live')
  })

  it('holds on to the old thread while the only session in hand came from the probe', () => {
    expect(threadToSave({ liveSessionId: 'probe', probed: true, resumeId: 'old' })).toBe('old')
  })

  it('saves nothing rather than the probe for a chat that has no thread yet', () => {
    expect(threadToSave({ liveSessionId: 'probe', probed: true, resumeId: null })).toBeNull()
  })

  it('falls back to what was resumed when no session has been reported', () => {
    expect(threadToSave({ liveSessionId: null, probed: false, resumeId: 'old' })).toBe('old')
  })
})

describe('threadLearned: the session a chat should remember from what the CLI reports', () => {
  it('learns the live session once a real run has one', () => {
    expect(threadLearned({ liveSessionId: 'live', probed: false })).toBe('live')
  })

  it('learns nothing from the probe, whose session is nobody’s conversation', () => {
    expect(threadLearned({ liveSessionId: 'probe', probed: true })).toBeNull()
  })

  it('learns nothing while no session has been reported', () => {
    expect(threadLearned({ liveSessionId: null, probed: false })).toBeNull()
  })
})
