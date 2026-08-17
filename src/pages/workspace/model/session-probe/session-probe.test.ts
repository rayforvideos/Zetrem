import { beforeEach, describe, expect, it } from 'vitest'
import { statusStore } from '@/entities/agent-session'
import { learnSession, learnUsage } from './session-probe'

const INIT = JSON.stringify({
  type: 'system',
  subtype: 'init',
  session_id: 'abc',
  cwd: '/w',
  model: 'claude-opus-5',
  permissionMode: 'ask',
  output_style: 'default',
  claude_code_version: '2.1.232',
  tools: ['Read', 'Bash'],
  agents: ['Explore', 'Siena'],
  mcp_servers: []
})

describe('learnSession: taking the session in without anyone speaking', () => {
  beforeEach(() => {
    statusStore.reset()
  })

  it('learns the tools and agents from the line the probe brought back', () => {
    learnSession(INIT)
    expect(statusStore.get().session?.tools).toEqual(['Read', 'Bash'])
    expect(statusStore.get().session?.agents).toEqual(['Explore', 'Siena'])
  })

  it('does nothing when the probe came back with nothing', () => {
    learnSession(null)
    expect(statusStore.get().session).toBeNull()
  })

  it('never speaks over a session that is already running, since that one is the truth', () => {
    learnSession(INIT)
    const live = statusStore.get().session
    learnSession(JSON.stringify({ ...JSON.parse(INIT), tools: ['Write'] }))
    expect(statusStore.get().session).toBe(live)
  })

  it('shrugs off a line that is not an init', () => {
    learnSession('{"type":"result","subtype":"success"}')
    expect(statusStore.get().session).toBeNull()
  })

  it('shrugs off a line that is not even json', () => {
    expect(() => learnSession('not json at all')).not.toThrow()
    expect(statusStore.get().session).toBeNull()
  })
})

describe('learnUsage: taking the account limits from what the CLI printed', () => {
  beforeEach(() => {
    statusStore.reset()
  })

  it('holds every limit the report named', () => {
    learnUsage(
      'Current session: 69% used · resets Aug 15 at 2am (Asia/Seoul)\n' +
        'Current week (all models): 52% used · resets Aug 20 at 6am (Asia/Seoul)',
    )
    expect(statusStore.get().limits.map((limit) => limit.kind)).toEqual(['five_hour', 'seven_day'])
  })

  it('does nothing when the report never came back', () => {
    learnUsage(null)
    expect(statusStore.get().limits).toEqual([])
  })

  it('leaves the limits alone when the report says nothing it understands', () => {
    learnUsage('You are currently using your subscription')
    expect(statusStore.get().limits).toEqual([])
  })

  it('gives way to a live reading of the same limit, since that one came from the API', () => {
    learnUsage('Current week (all models): 52% used · resets Aug 20 at 6am')
    statusStore.apply({
      type: 'limit',
      limit: { kind: 'seven_day', utilization: 0.6, resetsAtMs: 1787173200000, overage: false, status: 'allowed' }
    })
    expect(statusStore.get().limits).toHaveLength(1)
    expect(statusStore.get().limits[0]?.utilization).toBeCloseTo(0.6, 5)
  })
})
