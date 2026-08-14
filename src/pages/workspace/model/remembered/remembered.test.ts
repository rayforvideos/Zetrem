import { describe, expect, it } from 'vitest'
import { remembered } from './remembered'

const held = { tools: ['Read'], agents: ['Explore'] }

describe('remembered: writing down what the session told us, in one go', () => {
  it('returns both at once, because saving them apart lets one overwrite the other', () => {
    const patch = remembered({ tools: ['Read', 'Bash'], agents: ['Explore', 'Plan'] }, held)
    expect(patch).toEqual({ knownTools: ['Read', 'Bash'], knownAgents: ['Explore', 'Plan'] })
  })

  it('returns only the half that changed', () => {
    expect(remembered({ tools: ['Read'], agents: ['Explore', 'Plan'] }, held)).toEqual({
      knownAgents: ['Explore', 'Plan'],
    })
  })

  it('writes nothing when nothing changed', () => {
    expect(remembered({ tools: ['Read'], agents: ['Explore'] }, held)).toBe(null)
  })

  it('has nothing to write before a session has been seen', () => {
    expect(remembered({ tools: undefined, agents: undefined }, held)).toBe(null)
  })

  it('treats an empty list as nothing learned, so what is known is not wiped', () => {
    expect(remembered({ tools: [], agents: [] }, held)).toBe(null)
  })

  it('counts a different order as new', () => {
    expect(remembered({ tools: ['Read'], agents: ['Plan', 'Explore'] }, held)).toEqual({
      knownAgents: ['Plan', 'Explore'],
    })
  })
})
