import { describe, expect, it } from 'vitest'
import { leadOf } from './lead'

describe('leadOf: the line above the report, when it is not already below it', () => {
  it('drops the headline when the transcript already says it in full', () => {
    expect(
      leadOf('The dwell measures from startedAtMs…', [
        { role: 'assistant', text: 'The dwell measures from startedAtMs, which is when the tile opened.' },
      ]),
    ).toBeNull()
  })

  it('drops it when the transcript says exactly the same thing', () => {
    expect(leadOf('Two places fixed', [{ role: 'assistant', text: 'Two places fixed' }])).toBeNull()
  })

  it('keeps a headline the transcript never carried', () => {
    expect(
      leadOf('Reading the config', [{ role: 'assistant', text: 'Something else entirely' }]),
    ).toBe('Reading the config')
  })

  it('keeps it when nothing was said at all, since it is all there is', () => {
    expect(leadOf('Reading the config', [])).toBe('Reading the config')
  })

  it('does not let what you said stand in for what they said', () => {
    expect(leadOf('Look at the dwell', [{ role: 'user', text: 'Look at the dwell' }])).toBe(
      'Look at the dwell',
    )
  })

  it('has nothing to show for an empty headline', () => {
    expect(leadOf('', [{ role: 'assistant', text: 'x' }])).toBeNull()
  })
})
