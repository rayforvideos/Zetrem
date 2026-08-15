import { describe, expect, it } from 'vitest'
import { modelRefusedIn, withRefused, withoutRefused } from './refused'

const SAID =
  "There's an issue with the selected model (fable). It may not exist or you may not have access to it."

describe('modelRefusedIn: which model the account would not take', () => {
  it('reads the model out of the words the CLI sends', () => {
    expect(modelRefusedIn(SAID)).toBe('fable')
  })

  it('reads a full model id, since that is what the CLI is given', () => {
    expect(modelRefusedIn('issue with the selected model (claude-opus-5)')).toBe('opus')
  })

  it('says nothing about a failure that is not about a model', () => {
    expect(modelRefusedIn('The request was rejected')).toBeNull()
  })

  it('says nothing for a model it does not offer, rather than guessing', () => {
    expect(modelRefusedIn('issue with the selected model (gpt-9)')).toBeNull()
  })
})

describe('withRefused: keeping the list of what has been turned down', () => {
  it('adds one that has not been seen', () => {
    expect(withRefused([], 'fable')).toEqual(['fable'])
  })

  it('does not add the same one twice', () => {
    expect(withRefused(['fable'], 'fable')).toEqual(['fable'])
  })

  it('lets one back once it works, since a plan can change', () => {
    expect(withoutRefused(['fable', 'opus'], 'fable')).toEqual(['opus'])
  })

  it('leaves the list alone when clearing one that was never there', () => {
    expect(withoutRefused(['opus'], 'fable')).toEqual(['opus'])
  })
})
