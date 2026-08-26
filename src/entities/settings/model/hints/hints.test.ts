import { describe, expect, it } from 'vitest'
import { hintDue, hintSeen } from './hints'

describe('a hint shows once, in its moment, and never again', () => {
  it('shows when the moment is right and it has not been shown', () => {
    expect(hintDue('hire-first', [], true)).toBe(true)
  })

  it('stays away once it has been seen', () => {
    expect(hintDue('hire-first', ['hire-first'], true)).toBe(false)
  })

  it('stays away when the moment has passed, even if never seen', () => {
    expect(hintDue('hire-first', [], false)).toBe(false)
  })

  it('keeps the other hints when one is put away', () => {
    expect(hintSeen('ask-whole-job', ['hire-first'])).toEqual(['hire-first', 'ask-whole-job'])
  })

  it('does not write the same hint twice', () => {
    expect(hintSeen('hire-first', ['hire-first'])).toEqual(['hire-first'])
  })
})
