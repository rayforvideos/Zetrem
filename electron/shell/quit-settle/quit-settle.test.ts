import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quitSettle } from './quit-settle'

type Pending = { promise: Promise<void>; resolve(): void; reject(): void }

function pending(): Pending {
  let resolve = (): void => undefined
  let reject = (): void => undefined
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = () => no(new Error('the settle failed'))
  })
  return { promise, resolve, reject }
}

function held(work: Pending, deadlineMs = 1000) {
  const settle = vi.fn(() => work.promise)
  const late = vi.fn()
  const quit = vi.fn()
  return { gate: quitSettle({ settle, deadlineMs, late, quit }), settle, late, quit }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('quitSettle: a quit waits for the settle, but not forever', () => {
  it('holds the first quit and lets the next one through once the settle is done', async () => {
    const work = pending()
    const { gate, late, quit } = held(work)
    expect(gate.hold()).toBe(true)
    expect(quit).not.toHaveBeenCalled()
    work.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(quit).toHaveBeenCalledTimes(1)
    expect(late).not.toHaveBeenCalled()
    expect(gate.hold()).toBe(false)
  })

  it('quits at the deadline when the settle never comes, and says so', async () => {
    const work = pending()
    const { gate, late, quit } = held(work, 1000)
    gate.hold()
    await vi.advanceTimersByTimeAsync(999)
    expect(quit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(late).toHaveBeenCalledTimes(1)
    expect(quit).toHaveBeenCalledTimes(1)
    expect(gate.hold()).toBe(false)
  })

  it('quits only once when the settle lands after the deadline', async () => {
    const work = pending()
    const { gate, quit } = held(work, 1000)
    gate.hold()
    await vi.advanceTimersByTimeAsync(1000)
    work.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(quit).toHaveBeenCalledTimes(1)
  })

  it('quits when the settle fails, since there is nothing left to wait for', async () => {
    const work = pending()
    const { gate, late, quit } = held(work)
    gate.hold()
    work.reject()
    await vi.advanceTimersByTimeAsync(0)
    expect(quit).toHaveBeenCalledTimes(1)
    expect(late).not.toHaveBeenCalled()
  })

  it('holds a second quit during the settle without starting the settle over', async () => {
    const work = pending()
    const { gate, settle, quit } = held(work)
    expect(gate.hold()).toBe(true)
    expect(gate.hold()).toBe(true)
    expect(settle).toHaveBeenCalledTimes(1)
    work.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(quit).toHaveBeenCalledTimes(1)
  })

  it('leaves no deadline ticking once the settle has won', async () => {
    const work = pending()
    const { gate, late } = held(work, 1000)
    gate.hold()
    work.resolve()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(5000)
    expect(late).not.toHaveBeenCalled()
  })
})
