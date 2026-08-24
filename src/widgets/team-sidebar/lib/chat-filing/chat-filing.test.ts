import { describe, expect, it } from 'vitest'
import type { ChatSummary } from '@/entities/conversation'
import { fileChats } from './chat-filing'

let stamp = 9_000
function chat(folder: string, title = 'c'): ChatSummary {
  stamp -= 1
  return { id: `chat-${stamp.toString(36)}-a`, title, sessionId: null, savedAtMs: stamp, folder }
}

describe('fileChats: the folders a project has, and what is still loose', () => {
  it('has no folders at all until somebody files something', () => {
    const filing = fileChats([chat(''), chat('')])
    expect(filing.folders).toEqual([])
    expect(filing.loose).toHaveLength(2)
  })

  it('makes a folder out of the chats that name it', () => {
    const filing = fileChats([chat('출고'), chat(''), chat('출고')])
    expect(filing.folders.map((one) => one.name)).toEqual(['출고'])
    expect(filing.folders[0]?.chats).toHaveLength(2)
    expect(filing.loose).toHaveLength(1)
  })

  it('keeps the loose chats visible rather than hiding them behind a folder', () => {
    // Filing one chat must never make the others look gone. That is what the
    // categories did, and it read as losing your work.
    const loose = chat('')
    expect(fileChats([chat('출고'), loose]).loose.map((one) => one.id)).toEqual([loose.id])
  })

  it('orders folders by name, so the list does not shuffle as chats are saved', () => {
    const filing = fileChats([chat('출고'), chat('CS'), chat('리깅')])
    expect(filing.folders.map((one) => one.name)).toEqual(['CS', '리깅', '출고'])
  })

  it('keeps the freshest chat first inside a folder, the way the list is handed over', () => {
    const fresh = chat('출고')
    const older = chat('출고')
    const filing = fileChats([fresh, older])
    expect(filing.folders[0]?.chats.map((one) => one.id)).toEqual([fresh.id, older.id])
  })

  it('treats a folder of blanks as no folder', () => {
    expect(fileChats([chat('   ')]).folders).toEqual([])
  })
})
