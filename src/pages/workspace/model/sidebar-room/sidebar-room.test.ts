import { describe, expect, it } from 'vitest'
import { MIN_TALK_PX, sidebarFits, sidebarShows } from './sidebar-room'

describe('sidebarFits: whether there is room for the team beside the conversation', () => {
  it('keeps the team out when it would leave the conversation too narrow to read', () => {
    expect(sidebarFits(760, 340)).toBe(false)
  })

  it('lets the team in once the conversation still has room to read', () => {
    expect(sidebarFits(1440, 260)).toBe(true)
  })

  it('holds the line exactly at the width a conversation needs', () => {
    expect(sidebarFits(MIN_TALK_PX + 260, 260)).toBe(true)
    expect(sidebarFits(MIN_TALK_PX + 259, 260)).toBe(false)
  })

  it('assumes room before the window has been measured, so nothing flinches on first paint', () => {
    expect(sidebarFits(0, 260)).toBe(true)
  })
})

describe('sidebarShows: what the sidebar actually does', () => {
  it('follows what you asked for whenever there is room', () => {
    expect(sidebarShows(true, false, true)).toBe(true)
    expect(sidebarShows(false, true, true)).toBe(false)
  })

  it('gets out of the way in a narrow window, whatever the saved preference says', () => {
    expect(sidebarShows(true, false, false)).toBe(false)
  })

  it('still opens in a narrow window when you ask for it there and then', () => {
    expect(sidebarShows(false, true, false)).toBe(true)
  })
})
