import { describe, expect, it } from 'vitest'
import { withinCap } from './chat-cap'

const chat = (id: string, folder = '') => ({ id, folder })

describe('withinCap: what the list hands over', () => {
  it('hands everything over while the loose chats are under the cap', () => {
    const held = [chat('a'), chat('b')]
    expect(withinCap(held, 5)).toEqual(held)
  })

  it('caps the loose chats, keeping the freshest, since the list arrives freshest first', () => {
    const held = [chat('new'), chat('mid'), chat('old')]
    expect(withinCap(held, 2).map((one) => one.id)).toEqual(['new', 'mid'])
  })

  it('never drops a filed chat, however far down the list it sits', () => {
    // The prune spares filed chats on purpose. Truncating the list anyway made
    // them vanish from the sidebar while their files sat on disk — filing
    // promised keeping and delivered disappearing.
    const held = [chat('new'), chat('mid'), chat('filed', '출고')]
    expect(withinCap(held, 1).map((one) => one.id)).toEqual(['new', 'filed'])
  })

  it('does not let filed chats eat the room the loose ones get', () => {
    const held = [chat('f1', '출고'), chat('f2', '출고'), chat('a'), chat('b')]
    expect(withinCap(held, 2).map((one) => one.id)).toEqual(['f1', 'f2', 'a', 'b'])
  })

  it('keeps the order it was given, so the days still read in order', () => {
    const held = [chat('a'), chat('f', '출고'), chat('b')]
    expect(withinCap(held, 2).map((one) => one.id)).toEqual(['a', 'f', 'b'])
  })
})
