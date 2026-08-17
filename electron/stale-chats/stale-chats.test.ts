import { describe, expect, it } from 'vitest'
import { staleChats } from './stale-chats'

const at = (path: string, when: number) => ({ path, at: when })

describe('staleChats: which saved chats fall off the end', () => {
  it('keeps everything while there is room', () => {
    expect(staleChats([at('a', 3), at('b', 1)], 60)).toEqual([])
  })

  it('drops the oldest once the cap is passed', () => {
    const dated = [at('old', 1), at('new', 3), at('mid', 2)]
    expect(staleChats(dated, 2)).toEqual(['old'])
  })

  it('keeps the newest, since those are the ones you would reopen', () => {
    const dated = [at('a', 5), at('b', 4), at('c', 3), at('d', 2)]
    expect(staleChats(dated, 2)).toEqual(['c', 'd'])
  })

  it('drops nothing when the count sits exactly on the cap', () => {
    expect(staleChats([at('a', 2), at('b', 1)], 2)).toEqual([])
  })

  it('picks the same one every time when two share a timestamp', () => {
    const dated = [at('z', 1), at('a', 1), at('newest', 9)]
    expect(staleChats(dated, 2)).toEqual(['z'])
  })

  it('treats an unreadable timestamp as oldest, rather than keeping it forever', () => {
    expect(staleChats([at('broken', 0), at('good', 5)], 1)).toEqual(['broken'])
  })
})
