import { beforeEach, describe, expect, it } from 'vitest'
import { accountStatus } from './account-status'

const limit = {
  kind: 'five_hour',
  utilization: 0.5,
  resetsAtMs: 1,
  overage: false,
  status: 'allowed_warning',
} as const

beforeEach(() => {
  accountStatus.reset()
})

describe('accountStatus: what belongs to the account, not to a chat', () => {
  it('starts unread with no limits and no update', () => {
    expect(accountStatus.get()).toEqual({
      usage: 'unread',
      usageAtMs: null,
      limits: [],
      update: null,
    })
  })

  it('keeps a limit by kind and marks usage read', () => {
    accountStatus.applyLimit(limit)
    accountStatus.usageRead(42)
    expect(accountStatus.get().limits).toHaveLength(1)
    expect(accountStatus.get()).toMatchObject({ usage: 'read', usageAtMs: 42 })
  })

  it('forgets limits and usage when the account moves', () => {
    accountStatus.applyLimit(limit)
    accountStatus.usageRead(42)
    accountStatus.usageForgotten()
    expect(accountStatus.get()).toMatchObject({ usage: 'unread', usageAtMs: null, limits: [] })
  })

  it('does not lose the update on reset', () => {
    accountStatus.setUpdate({ current: '1', latest: '2', managedBy: null })
    accountStatus.usageForgotten()
    expect(accountStatus.get().update).toEqual({ current: '1', latest: '2', managedBy: null })
  })
})
