import { readConnectors } from '@/entities/connector'
import type { Connector, ConnectorVerb } from '@/entities/connector'
import type { PluginRun } from '@/entities/plugin'
import { runClaude } from './run-claude/run-claude'
import { handle } from './ipc/ipc'

const READ_TIMEOUT_MS = 30_000
const ACT_TIMEOUT_MS = 300_000

const VERBS: Record<ConnectorVerb, string> = {
  login: 'login',
  logout: 'logout',
  remove: 'remove',
}

function named(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  return name.length > 0 && !/[\n\r]/.test(name) ? name : null
}

export function registerConnectors(): void {
  handle('connectors:list', async (): Promise<Connector[]> => {
    const result = await runClaude(['mcp', 'list'], READ_TIMEOUT_MS)
    return readConnectors(result.out)
  })

  handle(
    'connectors:act',
    async (_event, verb: unknown, target: unknown): Promise<PluginRun> => {
      const name = named(target)
      const word = typeof verb === 'string' ? VERBS[verb as ConnectorVerb] : undefined
      if (name === null || word === undefined) {
        return { ok: false, out: 'Zetrem did not understand that request' }
      }
      return runClaude(['mcp', word, name], ACT_TIMEOUT_MS)
    },
  )
}
