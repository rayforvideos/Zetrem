import { describe, expect, it } from 'vitest'
import { notifyAllowed } from './notify-gate'

describe('notifyAllowed', () => {
  it('lets an allowed system through', async () => {
    expect(await notifyAllowed(() => Promise.resolve('allowed'))).toBe(true)
  })

  it('lets an undecided system through for macOS to ask itself', async () => {
    expect(await notifyAllowed(() => Promise.resolve('unasked'))).toBe(true)
  })

  it('keeps the switch off when the system says no', async () => {
    expect(await notifyAllowed(() => Promise.resolve('denied'))).toBe(false)
  })

  it('does not lock the user out when the read fails', async () => {
    expect(await notifyAllowed(() => Promise.reject(new Error('gone')))).toBe(true)
  })
})
