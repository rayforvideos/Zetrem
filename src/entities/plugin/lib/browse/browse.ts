import type { AvailablePlugin } from '../catalog/catalog.types'

export function browsable(
  available: AvailablePlugin[],
  held: Set<string>,
  query: string,
): AvailablePlugin[] {
  const pool = available.filter((plugin) => !held.has(plugin.id))
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return [...pool].sort(byReach)
  return pool.filter((plugin) =>
    `${plugin.name} ${plugin.description}`.toLowerCase().includes(needle),
  )
}

function byReach(a: AvailablePlugin, b: AvailablePlugin): number {
  const reach = (b.installCount ?? 0) - (a.installCount ?? 0)
  return reach !== 0 ? reach : a.name.localeCompare(b.name)
}
