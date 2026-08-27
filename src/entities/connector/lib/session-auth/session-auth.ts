import type { Connector } from '../../api/read-connectors/read-connectors.types'

type SessionServer = { name: string; status: string }

// A server handing out nothing but an authenticate tool still passes the health check, so the
// session's needs-auth verdict wins. Its tools are fixed at init, so it only ever downgrades.
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
