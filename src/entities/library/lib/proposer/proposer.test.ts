import { describe, expect, it } from 'vitest'
import { proposerLine } from './proposer'

describe('proposerLine: what a proposal says of where it came from', () => {
  it('carries both a teammate name and a chat title when it has them', () => {
    const line = proposerLine({ session: 'agent-1', by: 'React 개발자' }, (session) =>
      session === 'agent-1' ? 'Auth rework' : null,
    )
    expect(line).toEqual({ by: 'React 개발자', chatTitle: 'Auth rework' })
  })

  it('shows only the teammate name when the host is unknown, as after a restart', () => {
    const line = proposerLine({ session: 'agent-1', by: 'React 개발자' }, () => null)
    expect(line).toEqual({ by: 'React 개발자', chatTitle: null })
  })

  it('shows only the chat title when nobody named themselves', () => {
    const line = proposerLine({ session: 'agent-1', by: '' }, () => 'Auth rework')
    expect(line).toEqual({ by: '', chatTitle: 'Auth rework' })
  })

  it('is nothing at all when there is neither a name nor a session to trace', () => {
    expect(proposerLine({ session: '', by: '' }, () => 'unreached')).toBeNull()
  })

  it('never asks for a title when the proposal carries no session', () => {
    let asked = false
    proposerLine({ session: '', by: 'Orchestrator' }, () => {
      asked = true
      return null
    })
    expect(asked).toBe(false)
  })

  it('trims the name it was given', () => {
    const line = proposerLine({ session: '', by: '  React 개발자  ' }, () => null)
    expect(line?.by).toBe('React 개발자')
  })
})
