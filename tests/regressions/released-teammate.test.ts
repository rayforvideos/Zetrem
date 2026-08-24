import { describe, expect, it } from 'vitest'
import { allowedStock, stockAgents } from '@/entities/agent-session/model/stock/stock'
import { remembered } from '@/pages/workspace/model/remembered/remembered'

// A teammate that had been let go kept turning up under "Claude Code", switched
// on. Four fixes failed because each tried to work out, after the fact, which
// names in one flat list had been ours — and the answer depended on when you
// asked.
//
// The list is no longer mixed. The probe that teaches this is handed no
// teammates, so what it reports is Claude Code's own by construction, and a
// session's report teaches nothing about agents at all. These cases describe
// what that buys.

const THEIRS = ['claude', 'Explore', 'general-purpose', 'Plan', 'statusline-setup']

describe('a released teammate cannot become one of Claude Code’s own', () => {
  it('learns the agents from a probe that was handed nobody', () => {
    const learned = remembered({ tools: [], agents: THEIRS, probed: true }, { tools: [], agents: [] })
    expect(learned?.knownAgents).toEqual(THEIRS)
  })

  it('learns nothing from the session that was handed the team', () => {
    // This is the report that used to poison the list: it contains our
    // teammates, and no field says so.
    const learned = remembered(
      { tools: [], agents: [...THEIRS, '시에나', 'TTT'], probed: false },
      { tools: [], agents: THEIRS },
    )
    expect(learned?.knownAgents).toBeUndefined()
  })

  it('does not show a released teammate among their agents', () => {
    const learned = remembered({ tools: [], agents: THEIRS, probed: true }, { tools: [], agents: [] })
    const shown = stockAgents(learned?.knownAgents ?? [], ['시에나'])
    expect(shown).not.toContain('TTT')
  })

  it('has nothing that can switch an agent on behind your back', () => {
    // The worst of it was that a name which came back was read as newly
    // discovered and enabled itself. Nothing writes an enabled list any more:
    // being one of theirs is enough, and only an off switch is recorded.
    const off = allowedStock(THEIRS, [])
    expect(off).toEqual(THEIRS)
  })
})
