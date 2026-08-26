import { describe, expect, it } from 'vitest'
import type { Connector } from '../../api/read-connectors/read-connectors.types'
import { withSessionAuth } from './session-auth'

const gmail: Connector = {
  name: 'claude.ai Gmail',
  where: 'https://gmailmcp.googleapis.com/mcp/v1',
  state: 'connected',
}

describe('what the health check says, corrected by the session that knows', () => {
  it('marks a connector the session could not sign in to, whatever the health check said', () => {
    // claude mcp list probes the transport, and a server that answers while
    // handing out nothing but an authenticate tool still reads as connected.
    // The session's init is the one place the auth truth shows up.
    const merged = withSessionAuth([gmail], [{ name: 'claude.ai Gmail', status: 'needs-auth' }])
    expect(merged[0]?.state).toBe('needs-auth')
  })

  it('leaves a connector alone when the session agrees', () => {
    const merged = withSessionAuth([gmail], [{ name: 'claude.ai Gmail', status: 'connected' }])
    expect(merged[0]?.state).toBe('connected')
  })

  it('never upgrades: a health check that said needs-auth stands', () => {
    const listed: Connector = { ...gmail, state: 'needs-auth' }
    const merged = withSessionAuth([listed], [{ name: 'claude.ai Gmail', status: 'connected' }])
    expect(merged[0]?.state).toBe('needs-auth')
  })

  it('ignores session servers the list does not carry', () => {
    const merged = withSessionAuth([gmail], [{ name: 'somewhere-else', status: 'needs-auth' }])
    expect(merged[0]?.state).toBe('connected')
  })
})
