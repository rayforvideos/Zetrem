export type ConnectorState = 'connected' | 'needs-auth' | 'unapproved' | 'failed' | 'unknown'

export type Connector = {
  name: string
  where: string
  state: ConnectorState
}

export type ConnectorVerb = 'login' | 'logout' | 'remove'
