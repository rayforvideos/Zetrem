import { describe, expect, it } from 'vitest'
import { callableAgents } from './callable'

describe('callableAgents: how many of them this session can actually send out', () => {
  it('counts everyone the session knows when the plain Task tool is there', () => {
    expect(callableAgents(['Read', 'Task'], ['Explore', 'Plan', 'scout'])).toBe(3)
  })

  it('counts only the ones named in the agent entry', () => {
    expect(callableAgents(['Read', 'Agent(scout, Explore)'], ['Explore', 'Plan', 'scout'])).toBe(2)
  })

  it('counts none when nothing hands out work, however many are known', () => {
    expect(callableAgents(['Read', 'Bash'], ['Explore', 'Plan'])).toBe(0)
  })

  it('does not count the same name twice across entries', () => {
    expect(callableAgents(['Agent(scout)', 'Agent(scout, Plan)'], ['scout', 'Plan'])).toBe(2)
  })

  it('reads an entry with one name and no spaces', () => {
    expect(callableAgents(['Agent(Explore)'], ['Explore'])).toBe(1)
  })
})
