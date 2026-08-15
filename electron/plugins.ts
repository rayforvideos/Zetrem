import { readCatalog, readMarketplaces, safeTarget } from '@/entities/plugin'
import type { Catalog, Marketplace, PluginRun } from '@/entities/plugin'
import { runClaude } from './run-claude/run-claude'
import { handle } from './ipc/ipc'

const READ_TIMEOUT_MS = 20_000

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
    const result = await runClaude(['plugin', 'list', '--json', '--available'], READ_TIMEOUT_MS)
    return readCatalog(firstJson(result.out))
  })

  handle('plugins:marketplaces', async (): Promise<Marketplace[]> => {
    const result = await runClaude(['plugin', 'marketplace', 'list', '--json'], READ_TIMEOUT_MS)
    return readMarketplaces(firstJson(result.out))
  })

  handle('plugins:act', async (_event, verb: unknown, target: unknown): Promise<PluginRun> => {
    const name = safeTarget(target)
    if (name === null) return { ok: false, out: 'that name cannot be used' }
    switch (verb) {
      case 'install':
      case 'uninstall':
      case 'enable':
      case 'disable':
      case 'update':
        return runClaude(['plugin', verb, name], ACT_TIMEOUT_MS)
      case 'market-add':
        return runClaude(['plugin', 'marketplace', 'add', name], ACT_TIMEOUT_MS)
      case 'market-remove':
        return runClaude(['plugin', 'marketplace', 'remove', name], ACT_TIMEOUT_MS)
      case 'market-update':
        return runClaude(['plugin', 'marketplace', 'update', name], ACT_TIMEOUT_MS)
      default:
        return { ok: false, out: 'unknown action' }
    }
  })
}
