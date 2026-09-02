import { beforeEach, describe, expect, it } from 'vitest'
import { accountStatus } from '@/entities/agent-session'
import { accountChanged, accountChanges, subscribeAccountChange } from './account-change'

beforeEach(() => {
  accountStatus.reset()
})

describe('accountChanged: the one event everything derived from the account hears', () => {
  it('counts up, so a hook watching the number asks again', () => {
    const before = accountChanges()
    accountChanged()
    expect(accountChanges()).toBe(before + 1)
  })

  it('tells everyone listening, once each', () => {
    let heard = 0
    const stop = subscribeAccountChange(() => {
      heard += 1
    })
    accountChanged()
    expect(heard).toBe(1)
    stop()
    accountChanged()
    expect(heard).toBe(1)
  })

  it('drops the limits, which were the numbers of the account that has gone', () => {
    accountStatus.applyLimit({
      kind: 'five_hour',
      utilization: 0.2,
      resetsAtMs: 1787173200000,
      overage: false,
      status: 'allowed',
    })
    accountStatus.usageRead(1_700_000_000_000)

    accountChanged()

    expect(accountStatus.get()).toEqual({
      usage: 'unread',
      usageAtMs: null,
      limits: [],
      update: null,
    })
  })
})
