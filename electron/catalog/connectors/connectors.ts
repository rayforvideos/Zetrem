import { readConnectors } from '@/entities/connector/lib/read-connectors/read-connectors'
import { refusalOf, tidyName } from '@/entities/connector/lib/new-connector/new-connector'
import type { Connector, ConnectorVerb } from '@/entities/connector/lib/read-connectors/read-connectors.types'
import type { NewConnector } from '@/entities/connector/lib/new-connector/new-connector.types'
import type { PluginRun } from '@/entities/plugin/lib/catalog/catalog.types'
import { runClaude } from '../../spawn/run-claude/run-claude'
import { hereOrUndefined } from '../../store/project-memory/project-memory'
import { handle } from '../../ipc/ipc'

const READ_TIMEOUT_MS = 30_000
const ACT_TIMEOUT_MS = 300_000

const VERBS: ConnectorVerb[] = ['login', 'logout', 'remove']

function named(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  return name.length > 0 && !/[\n\r]/.test(name) ? name : null
}

export function registerConnectors(): void {
  handle('connectors:list', async (): Promise<Connector[]> => {
    const result = await runClaude(['mcp', 'list'], READ_TIMEOUT_MS, await hereOrUndefined())
    return readConnectors(result.out)
  })

  handle(
    'connectors:act',
    async (_event, verb: unknown, target: unknown): Promise<PluginRun> => {
      const name = named(target)
      const word = VERBS.find((one) => one === verb)
      if (name === null || word === undefined) {
        return { ok: false, out: 'garbled' }
      }
      return runClaude(['mcp', word, name], ACT_TIMEOUT_MS, await hereOrUndefined())
    },
  )

  handle(
    'connectors:add',
    async (_event, draft: unknown, taken: unknown): Promise<PluginRun> => {
      const wanted = draft as NewConnector
      if (typeof wanted?.name !== 'string' || typeof wanted?.url !== 'string') {
        return { ok: false, out: 'garbled' }
      }
      const held = Array.isArray(taken) ? taken.filter((one): one is string => typeof one === 'string') : []
      const refused = refusalOf(wanted, held)
      if (refused !== null) return { ok: false, out: refused.code }
      return runClaude(
        ['mcp', 'add', '--transport', 'http', tidyName(wanted.name), wanted.url.trim()],
        ACT_TIMEOUT_MS,
        await hereOrUndefined(),
      )
    },
  )

  handle('connectors:import', async (): Promise<PluginRun> => {
    return runClaude(['mcp', 'add-from-claude-desktop'], ACT_TIMEOUT_MS, await hereOrUndefined())
  })
}
