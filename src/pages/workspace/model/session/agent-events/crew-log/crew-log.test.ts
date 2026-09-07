import { afterEach, describe, expect, it, vi } from 'vitest'
import { CREW_LOG_MAX, createCrewLog } from './crew-log'

afterEach(() => {
  vi.useRealTimers()
})

describe('createCrewLog: what the crew rules decided, kept in memory', () => {
  it('writes a line down with the ids it was handed', () => {
    const log = createCrewLog()
    log.note({
      event: 'childStarted',
      toolUseId: 'toolu_1',
      taskId: 'task_7',
      seat: 'toolu_1',
      decision: 'started',
    })
    expect(log.entries()).toHaveLength(1)
    const one = log.entries()[0]!
    expect(one.event).toBe('childStarted')
    expect(one.toolUseId).toBe('toolu_1')
    expect(one.taskId).toBe('task_7')
    expect(one.seat).toBe('toolu_1')
    expect(one.decision).toBe('started')
  })

  it('leaves an id nobody named as null, rather than an empty string nobody can read', () => {
    const log = createCrewLog()
    log.note({ event: 'settle', seat: 'a', decision: 'closed: lost' })
    const one = log.entries()[0]!
    expect(one.toolUseId).toBeNull()
    expect(one.taskId).toBeNull()
  })

  it('stamps the clock at the moment the decision was taken', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-07T14:03:21.842Z'))
    const log = createCrewLog()
    log.note({ event: 'childNotified', seat: 'a', decision: 'parked' })
    expect(log.entries()[0]?.atMs).toBe(Date.parse('2026-09-07T14:03:21.842Z'))
  })

  it('hands the entries back oldest first, so a paste reads in order', () => {
    const log = createCrewLog(10)
    for (const n of [1, 2, 3]) log.note({ event: 'childProgress', seat: 'a', decision: `${n}` })
    expect(log.entries().map((one) => one.decision)).toEqual(['1', '2', '3'])
  })

  it('keeps only the last few, and drops the oldest to make room', () => {
    const log = createCrewLog(3)
    for (const n of [1, 2, 3, 4, 5])
      log.note({ event: 'childProgress', seat: 'a', decision: `${n}` })
    expect(log.entries().map((one) => one.decision)).toEqual(['3', '4', '5'])
  })

  it('stays that size however long the run goes on, so a chat cannot grow without end', () => {
    const log = createCrewLog(4)
    for (let n = 0; n < 400; n += 1)
      log.note({ event: 'childProgress', seat: 'a', decision: `${n}` })
    expect(log.entries()).toHaveLength(4)
    expect(log.entries().map((one) => one.decision)).toEqual(['396', '397', '398', '399'])
  })

  it('goes round more than once without losing the order', () => {
    const log = createCrewLog(3)
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      log.note({ event: 'childProgress', seat: 'a', decision: `${n}` })
    }
    expect(log.entries().map((one) => one.decision)).toEqual(['5', '6', '7'])
  })

  it('empties on clear', () => {
    const log = createCrewLog(3)
    log.note({ event: 'session', decision: 'began' })
    log.clear()
    expect(log.entries()).toEqual([])
    log.note({ event: 'session', decision: 'began again' })
    expect(log.entries().map((one) => one.decision)).toEqual(['began again'])
  })

  it('holds a few hundred by default, which is a run gone wrong and not a transcript', () => {
    expect(CREW_LOG_MAX).toBeGreaterThanOrEqual(200)
    expect(CREW_LOG_MAX).toBeLessThanOrEqual(2000)
  })
})
