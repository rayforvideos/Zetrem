import { describe, expect, it } from 'vitest'
import { allowedStock, stockAgents } from '@/entities/teammate/model/stock/stock'
import { remembered } from '@/pages/workspace/model/chat/remembered/remembered'

// The probe that teaches which agents are Claude Code's is handed no teammates,
// so what it reports is its own by construction; a session's report, which
// contains ours with no field saying so, teaches nothing about agents at all.

const THEIRS = ['claude', 'Explore', 'general-purpose', 'Plan', 'statusline-setup']

describe('a released teammate cannot become one of Claude Code’s own', () => {
  it('learns the agents from a probe that was handed nobody', () => {
    const learned = remembered(
      { tools: [], agents: THEIRS, probed: true },
      { tools: [], agents: [] },
    )
    expect(learned?.knownAgents).toEqual(THEIRS)
  })

  it('learns nothing from the session that was handed the team', () => {
    const learned = remembered(
      { tools: [], agents: [...THEIRS, '시에나', 'TTT'], probed: false },
      { tools: [], agents: THEIRS },
    )
    expect(learned?.knownAgents).toBeUndefined()
  })

  it('does not show a released teammate among their agents', () => {
    const learned = remembered(
      { tools: [], agents: THEIRS, probed: true },
      { tools: [], agents: [] },
    )
    const shown = stockAgents(learned?.knownAgents ?? [], ['시에나'])
    expect(shown).not.toContain('TTT')
  })

  it('has nothing that can switch an agent on behind your back', () => {
    const off = allowedStock(THEIRS, [])
    expect(off).toEqual(THEIRS)
  })
})
