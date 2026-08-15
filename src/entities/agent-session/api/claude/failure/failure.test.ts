import { describe, expect, it } from 'vitest'
import { failureLine, retryLine, stoppedLine } from './failure'

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

describe('stoppedLine: what to say when a turn ends badly', () => {
  const REFUSED =
    "There's an issue with the selected model (fable). It may not exist or you may not have access to it. Run --model to pick a different model."

  function ended(over: Partial<Parameters<typeof stoppedLine>[0]> = {}) {
    return stoppedLine({ subtype: 'success', isError: false, error: '', result: '', errors: null, ...over })
  }

  it('says nothing about a turn that went fine', () => {
    expect(ended({ result: 'all done' })).toBeNull()
  })

  it('speaks up for a failure the CLI calls a success, which is how a bad model arrives', () => {
    expect(ended({ isError: true, error: 'model_not_found', result: REFUSED })).not.toBeNull()
  })

  it('names the model your account cannot use, since that is the whole message', () => {
    expect(ended({ isError: true, error: 'model_not_found', result: REFUSED })).toContain('fable')
  })

  it('points at Settings, not at a command line flag this window does not have', () => {
    const said = ended({ isError: true, error: 'model_not_found', result: REFUSED })
    expect(said).toContain('Settings')
    expect(said).not.toContain('--model')
  })

  it('reads it as a model problem even when the CLI names no error kind', () => {
    expect(ended({ isError: true, result: REFUSED })).toContain('not available on your account')
  })

  it('passes on any other failure in the CLI words, with the flag advice taken out', () => {
    const said = ended({ isError: true, result: 'The request was refused. Run --model to pick a different model.' })
    expect(said).toContain('The request was refused')
    expect(said).not.toContain('--model')
  })

  it('still says something when a failure carries no words at all', () => {
    expect(ended({ isError: true })).toBe('Stopped: something went wrong')
  })

  it('leaves the older error subtypes to the reason they already had', () => {
    expect(ended({ subtype: 'error_max_turns', isError: true })).toContain('limit on how many turns')
  })
})
