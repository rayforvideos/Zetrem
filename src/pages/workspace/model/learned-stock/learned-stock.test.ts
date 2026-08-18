import { describe, expect, it } from 'vitest'
import { learnedStock } from './learned-stock'

const NONE: string[] = []

describe('learnedStock: keeping the built-in switches honest', () => {
  it('turns on the ones a session just told us about, since they are already callable', () => {
    expect(learnedStock(['Explore', 'Plan'], NONE, NONE, NONE, NONE)).toEqual(['Explore', 'Plan'])
  })

  it('leaves a name the user turned off alone, because that was a decision', () => {
    expect(learnedStock(['Explore'], ['Explore'], NONE, NONE, NONE)).toBeNull()
  })

  it('adds only what is new, keeping the rest of the picks', () => {
    expect(learnedStock(['Explore', 'Plan'], ['Explore'], ['Explore'], NONE, NONE)).toEqual([
      'Explore',
      'Plan',
    ])
  })

  it('says nothing when the session brought nothing new', () => {
    expect(learnedStock(['Explore'], ['Explore'], ['Explore'], NONE, NONE)).toBeNull()
  })

  it('never turns on our own people, who are not built-ins', () => {
    expect(learnedStock(['Siena'], NONE, NONE, ['Siena'], NONE)).toBeNull()
  })

  it('never turns on an agent someone wrote by hand, which Zetrem does not run', () => {
    expect(learnedStock(['Ray'], NONE, NONE, NONE, ['Ray'])).toBeNull()
  })

  it('never turns on a plugin agent, which belongs to its plugin', () => {
    expect(learnedStock(['nx:ci-monitor'], NONE, NONE, NONE, NONE)).toBeNull()
  })
})
