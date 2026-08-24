import { readCatalog, readMarketplaces } from '@/entities/plugin/lib/catalog/catalog'
import { safeTarget } from '@/entities/plugin/lib/target/target'
import { withScope } from '@/entities/plugin/lib/scope/scope'
import type { Catalog, Marketplace, PluginRun } from '@/entities/plugin/lib/catalog/catalog.types'
import { runClaude } from './run-claude/run-claude'
import { handle } from './ipc/ipc'
import { recallProject } from './project-memory/project-memory'

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
      (await recallProject()) ?? undefined,
    )
    return readCatalog(firstJson(result.out))
  })

  handle('plugins:available', async (): Promise<Catalog> => {
    const result = await runClaude(
      ['plugin', 'list', '--json', '--available'],
      BROWSE_TIMEOUT_MS,
      (await recallProject()) ?? undefined,
    )
    return readCatalog(firstJson(result.out))
  })

  handle('plugins:marketplaces', async (): Promise<Marketplace[]> => {
    const where = await recallProject()
    const result = await runClaude(
      ['plugin', 'marketplace', 'list', '--json'],
      READ_TIMEOUT_MS,
      where ?? undefined,
    )
    return readMarketplaces(firstJson(result.out))
  })

  handle(
    'plugins:act',
    async (_event, verb: unknown, target: unknown, scope: unknown): Promise<PluginRun> => {
    const name = safeTarget(target)
    if (name === null) return { ok: false, out: 'that name cannot be used' }
    switch (verb) {
      case 'uninstall':
      case 'enable':
      case 'disable':
      case 'update':
        return runClaude(
          withScope(['plugin', verb, name], verb, scope),
          ACT_TIMEOUT_MS,
          (await recallProject()) ?? undefined,
        )
      case 'install':
        return runClaude(['plugin', verb, name], ACT_TIMEOUT_MS, (await recallProject()) ?? undefined)
      case 'market-add':
        return runClaude(['plugin', 'marketplace', 'add', name], ACT_TIMEOUT_MS)
      case 'market-remove':
        return runClaude(['plugin', 'marketplace', 'remove', name], ACT_TIMEOUT_MS)
      case 'market-update':
        return runClaude(['plugin', 'marketplace', 'update', name], ACT_TIMEOUT_MS)
      default:
        return { ok: false, out: 'unknown action' }
    }
    },
  )
}
