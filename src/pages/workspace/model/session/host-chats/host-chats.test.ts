import { describe, expect, it } from 'vitest'
import { chatOfHost, rememberHostChat } from './host-chats'

describe('host-chats: which chat a running host belongs to', () => {
  it('knows nothing about a host it was never told of', () => {
    expect(chatOfHost('agent-nope')).toBeNull()
  })

  it('gives back the chat a host was remembered for', () => {
    rememberHostChat('agent-1', 'chat-1')
    expect(chatOfHost('agent-1')).toBe('chat-1')
  })

  it('keeps hosts apart', () => {
    rememberHostChat('agent-2', 'chat-a')
    rememberHostChat('agent-3', 'chat-b')
    expect(chatOfHost('agent-2')).toBe('chat-a')
    expect(chatOfHost('agent-3')).toBe('chat-b')
  })

  it('a later remembering for the same host replaces the earlier one', () => {
    rememberHostChat('agent-4', 'chat-old')
    rememberHostChat('agent-4', 'chat-new')
    expect(chatOfHost('agent-4')).toBe('chat-new')
  })
})
