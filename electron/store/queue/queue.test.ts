import { describe, expect, it } from 'vitest'
import { queue } from './queue'

function later<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

describe('queue: two writes to one file never overlap', () => {
  it('runs the second only after the first has finished', async () => {
    const next = queue()
    const order: string[] = []
    const slow = next(async () => {
      await later(20, null)
      order.push('slow')
    })
    const quick = next(async () => {
      order.push('quick')
    })
    await Promise.all([slow, quick])
    expect(order, 'the later one finishing first would mix the files').toEqual(['slow', 'quick'])
  })

  it('hands each caller its own result', async () => {
    const next = queue()
    expect(await Promise.all([next(async () => 'a'), next(async () => 'b')])).toEqual(['a', 'b'])
  })

  it('keeps going after one piece of work throws', async () => {
    const next = queue()
    const failed = next(async () => {
      throw new Error('nope')
    })
    await expect(failed).rejects.toThrow('nope')
    await expect(next(async () => 'still here')).resolves.toBe('still here')
  })

  it('lets the caller see the failure rather than swallowing it', async () => {
    const next = queue()
    const first = next(async () => {
      throw new Error('boom')
    })
    const second = next(async () => 'fine')
    await expect(first).rejects.toThrow('boom')
    await expect(second).resolves.toBe('fine')
  })

  it('holds the order across many pieces of work', async () => {
    const next = queue()
    const order: number[] = []
    await Promise.all(
      [30, 5, 20, 1].map((ms, at) =>
        next(async () => {
          await later(ms, null)
          order.push(at)
        }),
      ),
    )
    expect(order).toEqual([0, 1, 2, 3])
  })
})
