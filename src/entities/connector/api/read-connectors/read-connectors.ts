import type { Connector, ConnectorState } from './read-connectors.types'

const LINE = /^(.+?):\s+(.*?)\s+-\s+(.+)$/

function stateOf(said: string): ConnectorState {
  const plain = said
    .replace(/[^A-Za-z ]/g, '')
    .trim()
    .toLowerCase()
  if (plain.startsWith('connected')) return 'connected'
  if (plain.includes('needs authentication')) return 'needs-auth'
  if (plain.includes('pending approval')) return 'unapproved'
  if (plain.includes('failed') || plain.includes('error')) return 'failed'
  return 'unknown'
}

// The CLI names the Authorization header when a server authenticates by one,
// whether the token is missing, malformed or rejected. Such a server has no
// sign-in; its header is changed in the Claude settings, not here.
function authByHeaderIn(said: string): boolean {
  return /authorization header|headers\.authorization/i.test(said)
}

export function canSignIn(connector: Connector): boolean {
  if (connector.state === 'unapproved' || connector.authByHeader) return false
  return /^https?:\/\//i.test(connector.where.trim())
}

export function readConnectors(out: string): Connector[] {
  const found: Connector[] = []
  const held = new Set<string>()
  for (const raw of out.split('\n')) {
    const match = LINE.exec(raw.trim())
    if (match === null) continue
    const name = (match[1] ?? '').trim()
    const where = (match[2] ?? '').trim()
    if (name.length === 0 || where.length === 0) continue
    if (held.has(name)) continue
    held.add(name)
    const said = match[3] ?? ''
    found.push({ name, where, state: stateOf(said), authByHeader: authByHeaderIn(said) })
  }
  return found
}

export function needingAuth(connectors: Connector[]): Connector[] {
  return connectors.filter((connector) => connector.state === 'needs-auth')
}
