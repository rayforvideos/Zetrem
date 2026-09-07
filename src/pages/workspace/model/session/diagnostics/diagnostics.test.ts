import { describe, expect, it } from 'vitest'
import type { CrewLogEntry } from '../agent-events/crew-log/crew-log.types'
import { aboutTeammate, crewLogLine, diagnosticsText } from './diagnostics'

function entry(overrides: Partial<CrewLogEntry> = {}): CrewLogEntry {
  return {
    atMs: Date.parse('2026-09-07T14:03:21.842Z'),
    event: 'childNotified',
    toolUseId: 'toolu_1',
    taskId: 'task_7',
    seat: 'toolu_1',
    decision: 'held: owns shell bash-1',
    ...overrides,
  }
}

describe('crewLogLine: one decision, on one line', () => {
  it('writes the time, the event, the ids and the decision', () => {
    expect(crewLogLine(entry())).toBe(
      '2026-09-07T14:03:21.842Z  childNotified     seat=toolu_1 tool=toolu_1 task=task_7  held: owns shell bash-1',
    )
  })

  it('leaves out an id nobody named, rather than printing an empty one', () => {
    const line = crewLogLine(entry({ seat: null, taskId: null }))
    expect(line).toContain('tool=toolu_1')
    expect(line).not.toContain('seat=')
    expect(line).not.toContain('task=')
  })

  it('says so plainly when the decision named nothing at all', () => {
    const line = crewLogLine(entry({ seat: null, taskId: null, toolUseId: null }))
    expect(line).toContain('  -  ')
  })
})

describe('aboutTeammate: which lines belong to one tile', () => {
  const mine = { seat: 'toolu_1', label: 'Explore', taskId: 'task_7' }

  it('takes the lines that landed on that tile', () => {
    const other = entry({ seat: 'toolu_2', toolUseId: 'toolu_2', taskId: 'task_9' })
    const found = aboutTeammate([entry(), other], mine)
    expect(found).toHaveLength(1)
    expect(found[0]?.seat).toBe('toolu_1')
  })

  it('takes an event that found no seat but named that tile’s tool call', () => {
    const dropped = entry({ seat: null, toolUseId: 'toolu_1', taskId: 'task_9' })
    expect(aboutTeammate([dropped], mine)).toHaveLength(1)
  })

  it('takes an event that named that tile’s task, however it was addressed', () => {
    const dropped = entry({ seat: null, toolUseId: null, taskId: 'task_7' })
    expect(aboutTeammate([dropped], mine)).toHaveLength(1)
  })

  it('leaves somebody else’s lines out', () => {
    const other = entry({ seat: 'toolu_2', toolUseId: 'toolu_2', taskId: 'task_9' })
    expect(aboutTeammate([other], mine)).toEqual([])
  })

  it('matches nothing by task when this tile has no task id of its own', () => {
    const nameless = { seat: 'toolu_1', label: 'Explore', taskId: null }
    const other = entry({ seat: null, toolUseId: null, taskId: 'task_7' })
    expect(aboutTeammate([other], nameless)).toEqual([])
  })
})

describe('diagnosticsText: the paste', () => {
  it('names the chat and counts what it is handing over', () => {
    const text = diagnosticsText([entry(), entry({ seat: 'toolu_2' })], {
      chat: 'Ship the release',
      about: null,
    })
    expect(text).toContain('Zetrem crew diagnostics')
    expect(text).toContain('chat: Ship the release')
    expect(text).toContain('entries: 2 of 2')
  })

  it('names the teammate and hands over only their lines', () => {
    const text = diagnosticsText(
      [entry(), entry({ seat: 'toolu_2', toolUseId: 'toolu_2', taskId: 'task_9' })],
      {
        chat: null,
        about: { seat: 'toolu_1', label: 'Explore', taskId: 'task_7' },
      },
    )
    expect(text).toContain('teammate: Explore (seat toolu_1, task task_7)')
    expect(text).toContain('entries: 1 of 2')
    expect(text).toContain('held: owns shell bash-1')
    expect(text).not.toContain('toolu_2')
  })

  it('writes every line the log kept, in the order they happened', () => {
    const first = entry({ atMs: 1000, decision: 'opened seat toolu_1' })
    const then = entry({ atMs: 2000, decision: 'parked' })
    const lines = diagnosticsText([first, then], { chat: null, about: null }).trim().split('\n')
    expect(lines.at(-2)).toContain('opened seat toolu_1')
    expect(lines.at(-1)).toContain('parked')
  })

  it('says so rather than handing over a blank page when nothing happened yet', () => {
    expect(diagnosticsText([], { chat: 'Empty', about: null })).toContain('No crew events yet.')
  })

  it('ends with a newline, so a paste into a report does not run into the next line', () => {
    expect(diagnosticsText([entry()], { chat: null, about: null }).endsWith('\n')).toBe(true)
  })
})
