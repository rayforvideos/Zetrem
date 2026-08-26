import type { Connector } from '../../api/read-connectors/read-connectors.types'

type SessionServer = { name: string; status: string }

/**
 * The health check probes the transport, and a server that answers while
 * handing out nothing but an authenticate tool still reads as connected
 * there. The session sat through init and knows which servers it could not
 * sign in to, so its needs-auth verdict stands over the health check's
 * optimism. It only ever downgrades: the session's tools are fixed at init,
 * so a sign-in that happened since does not help until the next session.
 */
export function withSessionAuth(connectors: Connector[], session: SessionServer[]): Connector[] {
  const refused = new Set(
    session.filter((server) => server.status === 'needs-auth').map((server) => server.name),
  )
  if (refused.size === 0) return connectors
  return connectors.map((connector) =>
    refused.has(connector.name) && connector.state === 'connected'
      ? { ...connector, state: 'needs-auth' }
      : connector,
  )
}
