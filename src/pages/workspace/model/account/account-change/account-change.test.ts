import { beforeEach, describe, expect, it } from 'vitest'
import { statusStore } from '@/entities/agent-session'
import { accountChanged, accountChanges, subscribeAccountChange } from './account-change'

const session = {
  id: 's1',
  cwd: '/w',
  model: 'claude-opus-5[1m]',
  permissionMode: 'acceptEdits',
  cliVersion: '2.1.231',
  mcp: [{ name: 'playwright', status: 'connected' }],
  tools: ['Bash'],
  agents: ['reviewer'],
}

beforeEach(() => {
  statusStore.reset()
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
    statusStore.apply({
      type: 'limit',
      limit: {
        kind: 'five_hour',
        utilization: 0.2,
        resetsAtMs: 1787173200000,
        overage: false,
        status: 'allowed',
      },
    })
    statusStore.usageRead(1_700_000_000_000)

    accountChanged()

    expect(statusStore.get().limits).toEqual([])
    expect(statusStore.get().usage).toBe('unread')
    expect(statusStore.get().usageAtMs).toBeNull()
  })

  it('forgets the session it learned, which was the other account’s', () => {
    statusStore.apply({ type: 'session', session })
    statusStore.learnProbe(session)
    expect(statusStore.get().session).not.toBeNull()

    accountChanged()

    expect(statusStore.get().session).toBeNull()
    expect(statusStore.get().probed).toBe(false)
  })
})
