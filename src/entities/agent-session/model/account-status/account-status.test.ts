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

  it('holds the latest limit warning', () => {
    accountStatus.applyLimit({
      kind: 'seven_day',
      utilization: 0.28,
      resetsAtMs: 1787173200000,
      overage: false,
      status: 'allowed_warning',
    })
    expect(accountStatus.get().limits[0]?.utilization).toBe(0.28)
  })

  it('takes update news from us, not from the CLI', () => {
    accountStatus.setUpdate({ current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' })
    expect(accountStatus.get().update).toEqual({
      current: '2.1.231',
      latest: '2.1.240',
      managedBy: 'Homebrew',
    })
  })

  it('keeps a five hour and a weekly limit side by side, since one does not replace the other', () => {
    accountStatus.applyLimit({
      kind: 'seven_day',
      utilization: 0.5,
      resetsAtMs: 1787173200000,
      overage: false,
      status: 'allowed',
    })
    accountStatus.applyLimit({
      kind: 'five_hour',
      utilization: 0.1,
      resetsAtMs: 1787000000000,
      overage: false,
      status: 'allowed',
    })
    expect(accountStatus.get().limits.map((limit) => limit.kind)).toEqual([
      'five_hour',
      'seven_day',
    ])
  })

  it('replaces a limit of the same kind rather than stacking it', () => {
    for (const utilization of [0.2, 0.4]) {
      accountStatus.applyLimit({
        kind: 'seven_day',
        utilization,
        resetsAtMs: 1787173200000,
        overage: false,
        status: 'allowed',
      })
    }
    expect(accountStatus.get().limits).toHaveLength(1)
    expect(accountStatus.get().limits[0]?.utilization).toBe(0.4)
  })
})

describe('usage: whether the limits on hand are fresh or only kept from before', () => {
  it('marks the limits as kept once the disk cache has been read', () => {
    accountStatus.usageKept()
    expect(accountStatus.get().usage).toBe('kept')
  })

  it('clears the kept mark once a fresh read succeeds', () => {
    accountStatus.usageKept()
    accountStatus.usageRead(1_700_000_000_000)
    expect(accountStatus.get().usage).toBe('read')
  })

  it('leaves the kept mark set when the fresh read fails, since the kept limits are still all there is', () => {
    accountStatus.usageKept()
    accountStatus.usageUnreadable()
    expect(accountStatus.get().usage).toBe('kept')
  })

  it('lets a failed read after forgetting say so, rather than reading as no limits', () => {
    accountStatus.usageForgotten()
    accountStatus.usageUnreadable()
    expect(accountStatus.get().usage).toBe('unreadable')
  })
})
