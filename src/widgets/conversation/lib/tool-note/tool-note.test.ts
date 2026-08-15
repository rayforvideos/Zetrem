import { describe, expect, it } from 'vitest'
import { noteParts } from './tool-note'

describe('noteParts: a failed call says why once, not twice', () => {
  it('lets a call that worked keep its note', () => {
    expect(noteParts('12 lines', false)).toEqual({ note: '12 lines', failure: null })
  })

  it('turns the note into the reason it failed, rather than adding the word after it', () => {
    expect(noteParts('The user denied this tool call', true)).toEqual({
      note: null,
      failure: 'The user denied this tool call',
    })
  })

  it('falls back to the bare word when the call left nothing to quote', () => {
    expect(noteParts(null, true)).toEqual({ note: null, failure: 'failed' })
    expect(noteParts('no output', true)).toEqual({ note: null, failure: 'failed' })
    expect(noteParts('   ', true)).toEqual({ note: null, failure: 'failed' })
  })
})
