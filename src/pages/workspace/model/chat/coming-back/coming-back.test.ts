import { describe, expect, it } from 'vitest'
import { comingBackTo } from './coming-back'

const saved = [{ id: 'newest' }, { id: 'older' }]

describe('comingBackTo: which chat a project opens on', () => {
  it('comes back to the chat that was being read, not the one saved last', () => {
    expect(comingBackTo(saved, 'older', false)).toBe('older')
  })

  it('comes back to a chat still in memory that has never been written', () => {
    expect(comingBackTo(saved, 'fresh', true)).toBe('fresh')
  })

  it('falls back to the newest save when the remembered chat is gone', () => {
    expect(comingBackTo(saved, 'removed', false)).toBe('newest')
  })

  it('takes the newest save when this project has never been opened here', () => {
    expect(comingBackTo(saved, null, false)).toBe('newest')
  })

  it('says there is nothing to open when the project has no saved chats', () => {
    expect(comingBackTo([], null, false)).toBeNull()
    expect(comingBackTo([], 'gone', false)).toBeNull()
  })
})
