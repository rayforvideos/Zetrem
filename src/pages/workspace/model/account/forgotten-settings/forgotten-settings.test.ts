import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/entities/settings'
import type { Settings } from '@/entities/settings'
import { forgottenOnAccountChange } from './forgotten-settings'

const held = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...patch })

describe('forgottenOnAccountChange: what the account decided, not the person', () => {
  it('clears a model one plan refused, which another plan allows', () => {
    expect(forgottenOnAccountChange(held({ refusedModels: ['opus'] }))).toEqual({
      refusedModels: [],
    })
  })

  it('clears the tools and agents it remembered, which only ever widened', () => {
    expect(
      forgottenOnAccountChange(held({ knownTools: ['Bash'], knownAgents: ['Explore'] })),
    ).toEqual({ knownTools: [], knownAgents: [] })
  })

  it('asks for no write when there is nothing to forget', () => {
    expect(forgottenOnAccountChange(DEFAULT_SETTINGS)).toBeNull()
  })

  it('leaves what the person chose, which no account has a say in', () => {
    const mine = held({
      refusedModels: ['opus'],
      knownTools: ['Bash'],
      model: 'opus',
      userName: 'Ray',
      theme: 'light',
      stockOff: ['Explore'],
    })
    const patch = forgottenOnAccountChange(mine)
    expect(patch?.model).toBeUndefined()
    expect(patch?.userName).toBeUndefined()
    expect(patch?.theme).toBeUndefined()
    expect(patch?.stockOff).toBeUndefined()
  })
})
