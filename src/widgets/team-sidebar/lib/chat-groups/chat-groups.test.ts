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

describe('groupChats — 시각 대신 묶음으로 언제인지 말한다', () => {
  it('오늘·어제·그 앞으로 나눈다', () => {
    expect(labels([chat(now - 60_000)])).toEqual(['Today'])
    expect(labels([chat(now - DAY)])).toEqual(['Yesterday'])
    expect(labels([chat(now - 4 * DAY)])).toEqual(['Previous 7 days'])
    expect(labels([chat(now - 20 * DAY)])).toEqual(['Previous 30 days'])
    expect(labels([chat(now - 200 * DAY)])).toEqual(['Older'])
  })

  it('오늘 새벽 한 시도 오늘이다 — 스물네 시간이 아니라 날짜로 센다', () => {
    expect(labels([chat(new Date('2026-08-14T01:00:00').getTime())])).toEqual(['Today'])
  })

  it('같은 묶음은 한 번만 이름을 단다', () => {
    const groups = groupChats([chat(now - 60_000), chat(now - 120_000)], now)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.chats).toHaveLength(2)
  })

  it('들어온 차례를 지킨다 — 목록은 이미 최근 순으로 온다', () => {
    const groups = groupChats([chat(now - 60_000), chat(now - DAY), chat(now - 4 * DAY)], now)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Previous 7 days'])
  })

  it('빈 목록은 빈 묶음이다', () => {
    expect(groupChats([], now)).toEqual([])
  })
})
