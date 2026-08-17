import { describe, expect, it } from 'vitest'
import { remembered } from './remembered'

const held = { tools: ['Read'], agents: ['Explore'] }

describe('remembered: writing down what the session told us, in one go', () => {
  it('returns both at once, because saving them apart lets one overwrite the other', () => {
    const patch = remembered({ tools: ['Read', 'Bash'], agents: ['Explore', 'Plan'], probed: false }, held)
    expect(patch).toEqual({ knownTools: ['Read', 'Bash'], knownAgents: ['Explore', 'Plan'] })
  })

  it('returns only the half that changed', () => {
    expect(remembered({ tools: ['Read'], agents: ['Explore', 'Plan'], probed: false }, held)).toEqual({
      knownAgents: ['Explore', 'Plan'],
    })
  })

  it('writes nothing when nothing changed', () => {
    expect(remembered({ tools: ['Read'], agents: ['Explore'], probed: false }, held)).toBe(null)
  })

  it('has nothing to write before a session has been seen', () => {
    expect(remembered({ tools: undefined, agents: undefined, probed: false }, held)).toBe(null)
  })

  it('treats an empty list as nothing learned, so what is known is not wiped', () => {
    expect(remembered({ tools: [], agents: [], probed: false }, held)).toBe(null)
  })

  it('counts a different order as new', () => {
    expect(remembered({ tools: ['Read'], agents: ['Plan', 'Explore'], probed: false }, held)).toEqual({
      knownAgents: ['Plan', 'Explore'],
    })
  })
})

describe('the tool list only ever grows, since a session sees whatever had connected by then', () => {
  it('keeps a tool this session did not mention, rather than dropping it from the picker', () => {
    const patch = remembered({ tools: ['Bash'], agents: undefined, probed: false }, { tools: ['Read', 'mcp__figma__x'], agents: [] })
    expect(patch).toEqual({ knownTools: ['Read', 'mcp__figma__x', 'Bash'] })
  })

  it('writes nothing when the session brought no name we did not have', () => {
    expect(remembered({ tools: ['Read'], agents: undefined, probed: false }, { tools: ['Read', 'Bash'], agents: [] })).toBe(null)
  })

  it('does not repeat a name it already holds', () => {
    const patch = remembered({ tools: ['Read', 'Bash'], agents: undefined, probed: false }, { tools: ['Read'], agents: [] })
    expect(patch).toEqual({ knownTools: ['Read', 'Bash'] })
  })

  it('replaces the agent list even when it shrank, since agents are all there from the start', () => {
    const patch = remembered({ tools: undefined, agents: ['Explore'], probed: false }, { tools: [], agents: ['Explore', 'Plan'] })
    expect(patch).toEqual({ knownAgents: ['Explore'] })
  })
})

describe('a probe knows the agents but not the tools, and is believed only that far', () => {
  const empty = { tools: [], agents: [] }

  it('takes the agents a probe found, which is the only way the list fills before the first turn', () => {
    const patch = remembered({ tools: ['Read'], agents: ['Explore', 'Plan'], probed: true }, empty)
    expect(patch, '프로브를 막으면 팀 목록이 영영 빈 채로 남는다').toEqual({
      knownAgents: ['Explore', 'Plan'],
    })
  })

  it('refuses the tools a probe found, since it exits before the connectors are up', () => {
    const patch = remembered({ tools: ['Read', 'Bash'], agents: undefined, probed: true }, empty)
    expect(patch).toBe(null)
  })

  it('leaves tools already known untouched when only a probe has spoken', () => {
    const held = { tools: ['mcp__figma__x'], agents: [] }
    const patch = remembered({ tools: ['Read'], agents: ['Explore'], probed: true }, held)
    expect(patch).toEqual({ knownAgents: ['Explore'] })
  })

  it('takes the tools once a real session reports them', () => {
    const patch = remembered({ tools: ['Read'], agents: undefined, probed: false }, empty)
    expect(patch).toEqual({ knownTools: ['Read'] })
  })
})
