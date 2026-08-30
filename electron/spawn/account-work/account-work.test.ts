import { describe, expect, it } from 'vitest'
import { accountWorkInFlight, duringAccountWork } from './account-work'

describe('the latch an account operation holds for as long as it runs', () => {
  it('is down before anything asks for it', () => {
    expect(accountWorkInFlight()).toBe(false)
  })

  it('is held for the whole of the work, not only its first step', async () => {
    const seen: boolean[] = []
    await duringAccountWork(async () => {
      seen.push(accountWorkInFlight())
      await Promise.resolve()
      seen.push(accountWorkInFlight())
    })
    expect(seen).toEqual([true, true])
    expect(accountWorkInFlight()).toBe(false)
  })

  it('is released after an operation that failed', async () => {
    await expect(
      duringAccountWork(async () => {
        throw new Error('the browser never came back')
      }),
    ).rejects.toThrow('the browser never came back')
    expect(accountWorkInFlight()).toBe(false)
  })

  it('stays held until the last operation lets go, not the first', async () => {
    let releaseOuter: (() => void) | null = null
    const outer = duringAccountWork(
      () =>
        new Promise<void>((resolve) => {
          releaseOuter = resolve
        }),
    )
    await duringAccountWork(async () => undefined)
    expect(accountWorkInFlight()).toBe(true)
    ;(releaseOuter as unknown as () => void)()
    await outer
    expect(accountWorkInFlight()).toBe(false)
  })
})
