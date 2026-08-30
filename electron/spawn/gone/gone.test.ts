import { describe, expect, it, vi } from 'vitest'
import { goneWatch } from './gone'

describe('goneWatch: waiting for the last child to go, but not forever', () => {
  it('is over before it began when nothing is left', async () => {
    expect(await goneWatch().within(true, 1000)).toBe(true)
  })

  it('ends the moment the registry says it emptied', async () => {
    const watch = goneWatch()
    const waited = watch.within(false, 1000)
    watch.note(true)
    expect(await waited).toBe(true)
  })

  it('says so when the deadline passes with children still there', async () => {
    vi.useFakeTimers()
    try {
      const watch = goneWatch()
      const waited = watch.within(false, 1000)
      await vi.advanceTimersByTimeAsync(1000)
      expect(await waited).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('wakes nobody while children are still there', async () => {
    vi.useFakeTimers()
    try {
      const watch = goneWatch()
      const waited = watch.within(false, 1000)
      watch.note(false)
      await vi.advanceTimersByTimeAsync(1000)
      expect(await waited).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('wakes everyone waiting, once, and forgets them', async () => {
    const watch = goneWatch()
    const both = Promise.all([watch.within(false, 1000), watch.within(false, 1000)])
    watch.note(true)
    expect(await both).toEqual([true, true])
    watch.note(true)
  })
})
