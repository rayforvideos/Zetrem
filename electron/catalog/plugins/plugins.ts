import { readCatalog, readMarketplaces } from '@/entities/plugin/lib/catalog/catalog'
import { safeTarget } from '@/entities/plugin/lib/target/target'
import { withScope } from '@/entities/plugin/lib/scope/scope'
import type { Catalog, Marketplace } from '@/entities/plugin/lib/catalog/catalog.types'
import { lost, textOf } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { runClaude } from '../../spawn/run-claude/run-claude'
import { handle } from '../../ipc/ipc'
import { hereOrUndefined } from '../../store/project-memory/project-memory'

const READ_TIMEOUT_MS = 20_000

const BROWSE_TIMEOUT_MS = 60_000

const ACT_TIMEOUT_MS = 180_000

function firstJson(out: string): unknown {
  const at = out.search(/[[{]/)
  if (at === -1) return null
  try {
    return JSON.parse(out.slice(at))
  } catch {
    return null
  }
}

export function registerPlugins(): void {
  handle('plugins:catalog', async (): Promise<Catalog> => {
    const result = await runClaude(
      ['plugin', 'list', '--json'],
      READ_TIMEOUT_MS,
      await hereOrUndefined(),
    )
    return readCatalog(firstJson(textOf(result)))
  })

  handle('plugins:available', async (): Promise<Catalog> => {
    const result = await runClaude(
      ['plugin', 'list', '--json', '--available'],
      BROWSE_TIMEOUT_MS,
      await hereOrUndefined(),
    )
    return readCatalog(firstJson(textOf(result)))
  })

  handle('plugins:marketplaces', async (): Promise<Marketplace[]> => {
    const result = await runClaude(
      ['plugin', 'marketplace', 'list', '--json'],
      READ_TIMEOUT_MS,
      await hereOrUndefined(),
    )
    return readMarketplaces(firstJson(textOf(result)))
  })

  handle(
    'plugins:act',
    async (_event, verb: unknown, target: unknown, scope: unknown): Promise<Outcome<string>> => {
    const name = safeTarget(target)
    if (name === null) return lost('refused', 'plugin-name')
    switch (verb) {
      case 'uninstall':
      case 'enable':
      case 'disable':
      case 'update':
        return runClaude(
          withScope(['plugin', verb, name], verb, scope),
          ACT_TIMEOUT_MS,
          await hereOrUndefined(),
        )
      case 'install':
        return runClaude(['plugin', verb, name], ACT_TIMEOUT_MS, await hereOrUndefined())
      case 'market-add':
        return runClaude(['plugin', 'marketplace', 'add', name], ACT_TIMEOUT_MS)
      case 'market-remove':
        return runClaude(['plugin', 'marketplace', 'remove', name], ACT_TIMEOUT_MS)
      case 'market-update':
        return runClaude(['plugin', 'marketplace', 'update', name], ACT_TIMEOUT_MS)
      default:
        return lost('unsupported', String(verb))
    }
    },
  )
}
