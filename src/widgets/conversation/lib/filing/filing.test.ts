import { describe, expect, it } from 'vitest'
import { filingTurnRequest } from './filing'

describe('filingTurnRequest: one answer becomes its own note', () => {
  it('quotes the answer as a blockquote, each non-empty line under a leading marker', () => {
    const out = filingTurnRequest('첫 줄\n\n둘째 줄')
    const quote = out.slice(out.indexOf('\n\n') + 2)
    for (const line of quote.split('\n')) {
      if (line.length === 0) continue
      expect(line.startsWith('> ') || line === '>').toBe(true)
    }
    expect(quote).toContain('> 첫 줄')
    expect(quote).toContain('> 둘째 줄')
  })

  it('keeps the original answer text inside the quote', () => {
    expect(filingTurnRequest('build the thing')).toContain('> build the thing')
  })

  it('asks for the analysis folder and links, and leaves a blank line before the quote', () => {
    const out = filingTurnRequest('answer here')
    expect(out).toContain('[[')
    expect(out).toContain('\n\n> answer here')
  })
})
