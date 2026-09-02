import { describe, expect, it } from 'vitest'
import { begin, cancel, expire, isPending, pendingDismiss } from './pending-dismiss'

describe('pending-dismiss: a dismiss that waits before it deletes', () => {
  it('hides an id the moment it is dismissed', () => {
    const state = pendingDismiss()
    begin(state, 'p1')
    expect(isPending(state, 'p1')).toBe(true)
  })

  it('undo restores it: nothing left pending, and it says there was something to cancel', () => {
    const state = pendingDismiss()
    const token = begin(state, 'p1')
    expect(cancel(state, 'p1')).toBe(true)
    expect(isPending(state, 'p1')).toBe(false)
    // The timer still fires after undo, but finds its token gone.
    expect(expire(state, 'p1', token)).toBe(false)
  })

  it('expiring deletes once', () => {
    const state = pendingDismiss()
    const token = begin(state, 'p1')
    expect(expire(state, 'p1', token)).toBe(true)
    expect(isPending(state, 'p1')).toBe(false)
  })

  it('two hides of different proposals both expire into a delete', () => {
    const state = pendingDismiss()
    const a = begin(state, 'p1')
    const b = begin(state, 'p2')
    expect(expire(state, 'p1', a)).toBe(true)
    expect(expire(state, 'p2', b)).toBe(true)
  })

  it('undo after the delete already ran is a no-op', () => {
    const state = pendingDismiss()
    const token = begin(state, 'p1')
    expire(state, 'p1', token)
    expect(cancel(state, 'p1')).toBe(false)
  })

  it('a second dismiss before the first expires keeps only the later one alive', () => {
    const state = pendingDismiss()
    const first = begin(state, 'p1')
    const second = begin(state, 'p1')
    expect(first).not.toBe(second)
    // The stale timer from the first dismiss must not delete.
    expect(expire(state, 'p1', first)).toBe(false)
    expect(isPending(state, 'p1')).toBe(true)
    expect(expire(state, 'p1', second)).toBe(true)
    expect(isPending(state, 'p1')).toBe(false)
  })
})
