import { describe, expect, it } from 'vitest'
import type { ChatSummary } from '@/entities/conversation'
import { canLand, canLandOnFolder, dropOnChat } from './chat-drop'

let stamp = 9_000
function chat(folder = '', id?: string): ChatSummary {
  stamp -= 1
  return {
    id: id ?? `chat-${stamp.toString(36)}-a`,
    title: 'c',
    sessionId: null,
    savedAtMs: stamp,
    folder,
  }
}

describe('dropOnChat: what carrying one chat onto another should mean', () => {
  it('does nothing when a chat lands on itself', () => {
    const one = chat()
    expect(dropOnChat(one, one)).toEqual({ kind: 'none' })
  })

  it('asks for a name when two loose chats meet, since the folder is new', () => {
    expect(dropOnChat(chat(), chat())).toEqual({ kind: 'name' })
  })

  it('joins the folder the chat underneath is already in', () => {
    expect(dropOnChat(chat(), chat('출고'))).toEqual({ kind: 'file', folder: '출고' })
  })

  it('does nothing when both are already in the same folder', () => {
    expect(dropOnChat(chat('출고'), chat('출고'))).toEqual({ kind: 'none' })
  })

  it('moves a filed chat to where the other one is', () => {
    expect(dropOnChat(chat('리깅'), chat('출고'))).toEqual({ kind: 'file', folder: '출고' })
  })

  it('asks for a name when a filed chat lands on a loose one', () => {
    expect(dropOnChat(chat('리깅'), chat())).toEqual({ kind: 'name' })
  })
})

describe('canLand: whether the ring should promise anything', () => {
  it('promises nothing over the chat being carried', () => {
    const one = chat()
    expect(canLand(one, one)).toBe(false)
  })

  it('promises nothing over a chat already in the same folder', () => {
    expect(canLand(chat('출고'), chat('출고'))).toBe(false)
  })

  it('promises a landing where something would actually happen', () => {
    expect(canLand(chat(), chat())).toBe(true)
    expect(canLand(chat(), chat('출고'))).toBe(true)
  })

  it('promises nothing when the carried chat is not known', () => {
    expect(canLand(undefined, chat())).toBe(false)
  })
})

describe('canLandOnFolder: whether a folder itself should promise anything', () => {
  it('promises nothing when the carried chat already lives there', () => {
    expect(canLandOnFolder(chat('출고'), '출고')).toBe(false)
  })

  it('matches the folder name without case', () => {
    expect(canLandOnFolder(chat('Ops'), 'ops')).toBe(false)
  })

  it('promises a landing when the chat lives elsewhere', () => {
    expect(canLandOnFolder(chat('리깅'), '출고')).toBe(true)
    expect(canLandOnFolder(chat(), '출고')).toBe(true)
  })

  it('promises nothing when nothing is being carried', () => {
    expect(canLandOnFolder(null, '출고')).toBe(false)
  })
})
