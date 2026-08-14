import { describe, expect, it } from 'vitest'
import type { ChatSummary } from '@/entities/conversation'
import { groupChats } from './chat-groups'

const now = new Date('2026-08-14T21:00:00').getTime()
const DAY = 86_400_000

function chat(savedAtMs: number, id = `chat-${savedAtMs.toString(36)}-a`): ChatSummary {
  return { id, title: id, sessionId: null, savedAtMs }
}

function labels(chats: ChatSummary[]): string[] {
  return groupChats(chats, now).map((group) => group.label)
}

describe('groupChats: saying when by grouping, not by stamping each row', () => {
  it('splits into today, yesterday and what came before', () => {
    expect(labels([chat(now - 60_000)])).toEqual(['Today'])
    expect(labels([chat(now - DAY)])).toEqual(['Yesterday'])
    expect(labels([chat(now - 4 * DAY)])).toEqual(['Previous 7 days'])
    expect(labels([chat(now - 20 * DAY)])).toEqual(['Previous 30 days'])
    expect(labels([chat(now - 200 * DAY)])).toEqual(['Older'])
  })

  it('counts one in the morning as today, because it counts by date and not by hours', () => {
    expect(labels([chat(new Date('2026-08-14T01:00:00').getTime())])).toEqual(['Today'])
  })

  it('names a group once', () => {
    const groups = groupChats([chat(now - 60_000), chat(now - 120_000)], now)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.chats).toHaveLength(2)
  })

  it('keeps the order it was given, which is newest first', () => {
    const groups = groupChats([chat(now - 60_000), chat(now - DAY), chat(now - 4 * DAY)], now)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Previous 7 days'])
  })

  it('groups nothing into nothing', () => {
    expect(groupChats([], now)).toEqual([])
  })
})
