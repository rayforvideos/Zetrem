import { describe, expect, it } from 'vitest'
import { reloadAsk } from './reload-keys'

function key(over: Record<string, unknown>) {
  return {
    type: 'keyDown',
    key: 'r',
    control: false,
    shift: false,
    alt: false,
    meta: false,
    ...over,
  }
}

describe('reloadAsk: the reload chords a menuless window must still hear', () => {
  it('reads Ctrl+R as a plain reload and Ctrl+Shift+R as a hard one', () => {
    expect(reloadAsk(key({ control: true }))).toBe('plain')
    expect(reloadAsk(key({ control: true, shift: true }))).toBe('hard')
  })

  it('reads F5 with and without Shift', () => {
    expect(reloadAsk(key({ key: 'F5' }))).toBe('plain')
    expect(reloadAsk(key({ key: 'F5', shift: true }))).toBe('hard')
  })

  it('lets every other stroke pass, key-ups included', () => {
    expect(reloadAsk(key({}))).toBe(null)
    expect(reloadAsk(key({ control: true, alt: true }))).toBe(null)
    expect(reloadAsk(key({ control: true, type: 'keyUp' }))).toBe(null)
    expect(reloadAsk(key({ key: 't', control: true }))).toBe(null)
  })
})
