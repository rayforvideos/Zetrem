export type ConnectorState = 'connected' | 'needs-auth' | 'unapproved' | 'failed' | 'unknown'

export type Connector = {
  name: string
  where: string
  state: ConnectorState
  // The server carries its credentials in an Authorization header, so the CLI
  // has no sign-in for it: the header is edited in the Claude settings instead.
  // Absent is the same as false; the parser always sets it.
  authByHeader?: boolean
}

export type ConnectorVerb = 'login' | 'logout' | 'remove'
