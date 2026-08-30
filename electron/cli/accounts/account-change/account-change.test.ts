import { describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => ({ forgotten: 0 }))

vi.mock('../../../store/kept-usage/kept-usage', () => ({
  forgetKeptUsage: async () => {
    fake.forgotten += 1
  },
}))

const { accountChanged, accountChanges } = await import('./account-change')

describe('accountChanges: the count work in flight is stamped with', () => {
  it('counts every change, so work started either side of one can be told apart', async () => {
    const before = accountChanges()
    await accountChanged()
    expect(accountChanges()).toBe(before + 1)
    await accountChanged()
    expect(accountChanges()).toBe(before + 2)
  })

  it('throws the kept usage reading away with the account it was read for', async () => {
    const before = fake.forgotten
    await accountChanged()
    expect(fake.forgotten).toBe(before + 1)
  })
})
