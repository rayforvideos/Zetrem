import { describe, expect, it } from 'vitest'
import type { ChatSummary } from '@/entities/conversation'
import { ROOMY, matchChats } from './chat-search'

let stamp = 9_000
function chat(title: string, folder = ''): ChatSummary {
  stamp -= 1
  return { id: `chat-${stamp.toString(36)}-a`, title, sessionId: null, savedAtMs: stamp, folder }
}

describe('matchChats: the way out when the folders stop helping', () => {
  it('hands everything back when nothing was typed', () => {
    const all = [chat('출고 자동화'), chat('리깅')]
    expect(matchChats(all, '')).toEqual(all)
    expect(matchChats(all, '   ')).toEqual(all)
  })

  it('keeps the chats whose name holds what was typed', () => {
    const found = matchChats([chat('출고 자동화 검토'), chat('리깅 질문')], '출고')
    expect(found.map((one) => one.title)).toEqual(['출고 자동화 검토'])
  })

  it('does not care about case, since nobody types it the same way twice', () => {
    expect(matchChats([chat('Batch Script')], 'batch')).toHaveLength(1)
    expect(matchChats([chat('batch script')], 'BATCH')).toHaveLength(1)
  })

  it('finds a chat by the folder it was filed under, so the name is a cue too', () => {
    expect(matchChats([chat('무제', '출고 자동화')], '출고')).toHaveLength(1)
  })

  it('finds nothing rather than everything when the words are not there', () => {
    expect(matchChats([chat('출고')], 'zzz')).toEqual([])
  })

  it('ignores the spaces around what was typed', () => {
    expect(matchChats([chat('출고')], '  출고  ')).toHaveLength(1)
  })

  it('calls a folder roomy at the size navigation starts to fail', () => {
    expect(ROOMY).toBe(12)
  })
})
