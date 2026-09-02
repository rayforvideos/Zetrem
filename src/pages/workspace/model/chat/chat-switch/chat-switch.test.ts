import { describe, expect, it } from 'vitest'
import { chatSwitch } from './chat-switch'

describe('chatSwitch: what a click on a chat in the sidebar asks for', () => {
  it('only returns to the chat that is already open, leaving its session alone', () => {
    expect(chatSwitch('a', 'a')).toBe('return')
  })

  it('swaps to another chat, which lets the running session go', () => {
    expect(chatSwitch('b', 'a')).toBe('swap')
  })

  it('swaps when no chat is open yet', () => {
    expect(chatSwitch('a', null)).toBe('swap')
  })
})
