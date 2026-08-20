import type { ConnectorOrigin } from './origin.types'

const PLUGIN = 'plugin:'
const ACCOUNT = 'claude.ai '

export function originOf(name: string): ConnectorOrigin {
  if (name.startsWith(PLUGIN)) return 'plugin'
  if (name.startsWith(ACCOUNT)) return 'account'
  return 'yours'
}

export function removableConnector(name: string): boolean {
  return originOf(name) === 'yours'
}

export function shortName(name: string): string {
  if (name.startsWith(PLUGIN)) return name.slice(PLUGIN.length)
  if (name.startsWith(ACCOUNT)) return name.slice(ACCOUNT.length)
  return name
}
