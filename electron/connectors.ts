import { readConnectors, refusalOf, tidyName } from '@/entities/connector'
import type { Connector, ConnectorVerb, NewConnector } from '@/entities/connector'
import type { PluginRun } from '@/entities/plugin'
import { runClaude } from './run-claude/run-claude'
import { recallProject } from './project-memory'
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
    const result = await runClaude(['mcp', 'list'], READ_TIMEOUT_MS, await here())
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
      return runClaude(['mcp', word, name], ACT_TIMEOUT_MS, await here())
    },
  )

  handle(
    'connectors:add',
    async (_event, draft: unknown, taken: unknown): Promise<PluginRun> => {
      const wanted = draft as NewConnector
      if (typeof wanted?.name !== 'string' || typeof wanted?.url !== 'string') {
        return { ok: false, out: 'Zetrem did not understand that request' }
      }
      const held = Array.isArray(taken) ? taken.filter((one): one is string => typeof one === 'string') : []
      const refused = refusalOf(wanted, held)
      if (refused !== null) return { ok: false, out: refused.why }
      return runClaude(
        ['mcp', 'add', '--transport', 'http', tidyName(wanted.name), wanted.url.trim()],
        ACT_TIMEOUT_MS,
        await here(),
      )
    },
  )

  handle('connectors:import', async (): Promise<PluginRun> => {
    return runClaude(['mcp', 'add-from-claude-desktop'], ACT_TIMEOUT_MS, await here())
  })
}

async function here(): Promise<string | undefined> {
  return (await recallProject()) ?? undefined
}
