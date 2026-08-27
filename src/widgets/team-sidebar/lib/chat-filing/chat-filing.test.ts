import { describe, expect, it } from 'vitest'
import type { ChatSummary } from '@/entities/conversation'
import { chatsInFolder, fileChats, renamedFolder } from './chat-filing'

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

describe('one place per name, in the order a person would count them', () => {
  it('counts the way people do, so sprint 2 comes before sprint 10', () => {
    const filing = fileChats([chat('sprint 10'), chat('sprint 2')])
    expect(filing.folders.map((one) => one.name)).toEqual(['sprint 2', 'sprint 10'])
  })

  it('treats one name typed two ways as one place', () => {
    const filing = fileChats([chat('Ops'), chat('ops')])
    expect(filing.folders).toHaveLength(1)
    expect(filing.folders[0]?.chats).toHaveLength(2)
  })

  it('keeps the spelling the folder was first given', () => {
    const filing = fileChats([chat('Ops'), chat('ops')])
    expect(filing.folders[0]?.name).toBe('Ops')
  })
})

describe('chatsInFolder: the chats currently wearing a name', () => {
  it('finds every chat filed under the name, without case', () => {
    const a = chat('출고')
    const b = chat('출고')
    const other = chat('리깅')
    expect(chatsInFolder([a, b, other], '출고')).toEqual([a, b])
  })

  it('matches the folder name without case', () => {
    const one = chat('Ops')
    expect(chatsInFolder([one], 'ops')).toEqual([one])
  })

  it('is empty when nothing wears that name', () => {
    expect(chatsInFolder([chat('출고')], '리깅')).toEqual([])
  })
})

describe('renamedFolder: fixing a name somebody typed', () => {
  it('names every chat that wore the old name', () => {
    const a = chat('출고')
    const b = chat('출고')
    const other = chat('리깅')
    expect(renamedFolder([a, b, other], '출고', '출고 자동화')).toEqual([a.id, b.id])
  })

  it('leaves everything alone when the name did not change', () => {
    expect(renamedFolder([chat('출고')], '출고', '출고')).toEqual([])
    expect(renamedFolder([chat('출고')], '출고', '  출고  ')).toEqual([])
  })

  it('refuses a blank name rather than unfiling everything by accident', () => {
    expect(renamedFolder([chat('출고')], '출고', '   ')).toEqual([])
  })

  it('matches the old name without case, the way the folders are grouped', () => {
    const one = chat('Ops')
    expect(renamedFolder([one], 'ops', 'Operations')).toEqual([one.id])
  })
})
