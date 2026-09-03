import { describe, expect, it } from 'vitest'
import { leadOf } from './lead'

describe('leadOf: the paragraph a card shows', () => {
  it('takes the first paragraph and stops at the blank line', () => {
    expect(leadOf('The conclusion.\n\nThe rest of it.')).toBe('The conclusion.')
  })

  it('keeps the markdown as written, so a card can render it', () => {
    expect(leadOf('We chose **B**, see [[Auth]].')).toBe('We chose **B**, see [[Auth]].')
  })

  it('joins the lines of one paragraph', () => {
    expect(leadOf('One line\nand its wrap.\n\nLater.')).toBe('One line\nand its wrap.')
  })

  it('walks past a heading to the words under it', () => {
    expect(leadOf('# Auth\n\nSessions won.')).toBe('Sessions won.')
    expect(leadOf('## Auth\nSessions won.')).toBe('Sessions won.')
  })

  it('walks past a leading code fence to the first prose', () => {
    expect(leadOf('```\nnpm test\n```\n\nIt passes.')).toBe('It passes.')
  })

  it('has nothing to say about a note with no prose', () => {
    expect(leadOf('')).toBe('')
    expect(leadOf('\n\n  \n')).toBe('')
    expect(leadOf('# Only a heading')).toBe('')
  })
})
