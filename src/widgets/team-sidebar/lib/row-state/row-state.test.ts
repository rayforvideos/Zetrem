import { describe, expect, it } from 'vitest'
import type { RosterState } from '@/entities/agent-session'
import type { TeamMember } from '../team/team.types'
import { rowStateOf } from './row-state'

function member(state: RosterState, sessionId: string | null = 'ses-1'): TeamMember {
  return {
    type: 'auditor',
    name: 'Joi',
    description: 'Reads code',
    model: null,
    character: null,
    origin: 'project',
    loaded: true,
    callable: true,
    state,
    note: null,
    sessionId,
  }
}

describe('rowStateOf: reading a report puts the row back to default', () => {
  it('shows the report and lights the row until you read it', () => {
    const before = rowStateOf(member('done'), [])
    expect(before.now).toBe('Reported back')
    expect(before.lit).toBe(true)
    expect(before.open).toBe('ses-1')
  })

  it('drops the line and the highlight once you have read it', () => {
    const after = rowStateOf(member('done'), ['ses-1'])
    expect(after.now).toBeNull()
    expect(after.lit).toBe(false)
    expect(after.state).toBe('idle')
  })

  it('sends a read row back to giving them a task, not to the old run', () => {
    expect(rowStateOf(member('done'), ['ses-1']).open).toBeNull()
  })

  it('keeps someone who needs you loud even after you looked', () => {
    const asked = rowStateOf(member('waiting'), ['ses-1'])
    expect(asked.now).toBe('Waiting on you')
    expect(asked.lit).toBe(true)
    expect(asked.open).toBe('ses-1')
  })

  it('keeps someone still working loud after you looked', () => {
    const busy = rowStateOf(member('working'), ['ses-1'])
    expect(busy.state).toBe('working')
    expect(busy.lit).toBe(true)
    expect(busy.open).toBe('ses-1')
  })

  it('keeps another run lit even while this one is read', () => {
    expect(rowStateOf(member('done', 'ses-2'), ['ses-1']).lit).toBe(true)
  })

  it('lights a run from an older session, which comes back idle', () => {
    const old = rowStateOf(member('idle'), [])
    expect(old.lit).toBe(true)
    expect(old.open).toBe('ses-1')
  })

  it('leaves someone who never ran plain', () => {
    const never = rowStateOf(member('idle', null), [])
    expect(never.lit).toBe(false)
    expect(never.open).toBeNull()
  })

  it('falls back to their own note when the state says nothing', () => {
    const one = { ...member('idle'), note: 'Ran twice today' }
    expect(rowStateOf(one, []).now).toBe('Ran twice today')
  })
})
