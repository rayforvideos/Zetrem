import { describe, expect, it } from 'vitest'
import { failureLine, retryLine } from './failure'

describe('failureLine: saying why a turn stopped short', () => {
  it('says nothing for a turn that ended well', () => {
    expect(failureLine('success', undefined)).toBeNull()
  })

  it('carries the words the CLI used, since they are the specific ones', () => {
    expect(failureLine('error_max_turns', ['Reached maximum number of turns (1)'])).toBe(
      'Stopped: Reached maximum number of turns (1)',
    )
  })

  it('joins several reasons rather than showing only the first', () => {
    expect(failureLine('error_during_execution', ['one thing', 'then another'])).toBe(
      'Stopped: one thing. then another',
    )
  })

  it('falls back to plain words when the CLI named no reason', () => {
    expect(failureLine('error_max_budget_usd', [])).toContain('spending limit')
  })

  it('still says something for a failure it has never seen', () => {
    expect(failureLine('error_from_the_future', null)).toBe('Stopped: error_from_the_future')
  })

  it('ignores entries that are not text', () => {
    expect(failureLine('error', [null, 42, 'the real one'])).toBe('Stopped: the real one')
  })
})

describe('retryLine: saying that it is trying again', () => {
  it('names the wait and which attempt this is', () => {
    expect(retryLine(2, 5, 4000, 'overloaded', 529)).toBe(
      'The model is overloaded (529). Trying again in 4s, attempt 2 of 5',
    )
  })

  it('gives a sub second wait in milliseconds rather than rounding it to zero', () => {
    expect(retryLine(1, 3, 400, 'rate_limit', null)).toBe(
      'Rate limited. Trying again in 400ms, attempt 1 of 3',
    )
  })

  it('leaves out a status nobody reported', () => {
    expect(retryLine(1, 3, 1000, 'server_error', null)).not.toContain('(')
  })

  it('has words for a reason it does not know', () => {
    expect(retryLine(1, 3, 1000, 'something_new', null)).toContain('The request failed')
  })
})
