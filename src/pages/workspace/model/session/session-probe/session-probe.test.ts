import { beforeEach, describe, expect, it } from 'vitest'
import { accountStatus, createChatStatus } from '@/entities/agent-session'
import { learnKeptUsage, learnSession, learnUsage } from './session-probe'

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
  mcp_servers: [],
})

describe('learnSession: taking the session in without anyone speaking', () => {
  beforeEach(() => {
    accountStatus.reset()
  })

  it('learns the tools and agents from the line the probe brought back', () => {
    const status = createChatStatus()
    learnSession(status, INIT)
    expect(status.get().session?.tools).toEqual(['Read', 'Bash'])
    expect(status.get().session?.agents).toEqual(['Explore', 'Siena'])
  })

  it('does nothing when the probe came back with nothing', () => {
    const status = createChatStatus()
    learnSession(status, null)
    expect(status.get().session).toBeNull()
  })

  it('does nothing when there is no chat status to learn into', () => {
    expect(() => learnSession(null, INIT)).not.toThrow()
  })

  it('never speaks over a session that is already running, since that one is the truth', () => {
    const status = createChatStatus()
    learnSession(status, INIT)
    const live = status.get().session
    learnSession(status, JSON.stringify({ ...JSON.parse(INIT), tools: ['Write'] }))
    expect(status.get().session).toBe(live)
  })

  it('learns again once the account changed and the session was forgotten', () => {
    const status = createChatStatus()
    learnSession(status, INIT)
    const other = status.get().session
    status.forgetSession()

    learnSession(
      status,
      JSON.stringify({ ...JSON.parse(INIT), session_id: 'mine', tools: ['Write'] }),
    )

    expect(status.get().session).not.toBe(other)
    expect(status.get().session?.tools).toEqual(['Write'])
  })

  it('shrugs off a line that is not an init', () => {
    const status = createChatStatus()
    learnSession(status, '{"type":"result","subtype":"success"}')
    expect(status.get().session).toBeNull()
  })

  it('shrugs off a line that is not even json', () => {
    const status = createChatStatus()
    expect(() => learnSession(status, 'not json at all')).not.toThrow()
    expect(status.get().session).toBeNull()
  })
})

describe('learnUsage: taking the account limits from what the CLI printed', () => {
  beforeEach(() => {
    accountStatus.reset()
  })

  it('holds every limit the report named', () => {
    learnUsage(
      'Current session: 69% used · resets Aug 15 at 2am (Asia/Seoul)\n' +
        'Current week (all models): 52% used · resets Aug 20 at 6am (Asia/Seoul)',
    )
    expect(accountStatus.get().limits.map((limit) => limit.kind)).toEqual([
      'five_hour',
      'seven_day',
    ])
  })

  it('does nothing when the report never came back', () => {
    learnUsage(null)
    expect(accountStatus.get().limits).toEqual([])
  })

  it('leaves the limits alone when the report says nothing it understands', () => {
    learnUsage('You are currently using your subscription')
    expect(accountStatus.get().limits).toEqual([])
  })

  it('gives way to a live reading of the same limit, since that one came from the API', () => {
    learnUsage('Current week (all models): 52% used · resets Aug 20 at 6am')
    accountStatus.applyLimit({
      kind: 'seven_day',
      utilization: 0.6,
      resetsAtMs: 1787173200000,
      overage: false,
      status: 'allowed',
    })
    expect(accountStatus.get().limits).toHaveLength(1)
    expect(accountStatus.get().limits[0]?.utilization).toBeCloseTo(0.6, 5)
  })
})

describe('learnKeptUsage: taking the account limits kept from an earlier reading', () => {
  beforeEach(() => {
    accountStatus.reset()
  })

  it('marks what it holds as kept, not fresh', () => {
    learnKeptUsage('Current week (all models): 52% used · resets Aug 20 at 6am')
    expect(accountStatus.get().usage).toBe('kept')
    expect(accountStatus.get().limits).toHaveLength(1)
  })

  it('does nothing when there was no cache to read', () => {
    learnKeptUsage(null)
    expect(accountStatus.get().usage).toBe('unread')
    expect(accountStatus.get().limits).toEqual([])
  })

  it('steps aside once a live reading has already arrived, since that one outranks the cache', () => {
    learnUsage('Current week (all models): 52% used · resets Aug 20 at 6am')
    learnKeptUsage('Current week (all models): 99% used · resets Aug 20 at 6am')
    expect(accountStatus.get().usage).toBe('read')
    expect(accountStatus.get().limits[0]?.utilization).toBeCloseTo(0.52, 5)
  })
})
