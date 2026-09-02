import { describe, expect, it } from 'vitest'
import { createChatStatus } from '../status-store/status-store'
import { accountStatus } from '../account-status/account-status'
import { statusView } from './status-view'

describe('statusView: the strip sees one object', () => {
  it('merges the chat and the account', () => {
    const chat = createChatStatus()
    chat.apply({ type: 'activity', activity: 'requesting' })
    accountStatus.usageKept()
    const seen = statusView(chat.get(), accountStatus.get())
    expect(seen.activity).toBe('requesting')
    expect(seen.usage).toBe('kept')
  })
})
