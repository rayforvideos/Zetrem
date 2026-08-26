import { grouped } from '@/shared/lib/grouped/grouped'
import type { InstalledPlugin } from '../../api/catalog/catalog.types'
import type { PluginGroup, PluginGroupKey } from './groups.types'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

const ORDER: { key: PluginGroupKey; title: MessageDescriptor; note: MessageDescriptor | null }[] = [
  { key: 'yours', title: msg`Yours`, note: null },
  {
    key: 'project',
    title: msg`This project`,
    note: msg`Installed for this folder. Anyone who opens it gets them.`,
  },
  {
    key: 'organisation',
    title: msg`Your organisation`,
    note: msg`Set for everyone on your account. They cannot be removed or turned off here.`,
  },
]

function keyOf(plugin: InstalledPlugin): PluginGroupKey {
  if (plugin.scope === 'managed') return 'organisation'
  if (plugin.scope === 'project') return 'project'
  return 'yours'
}

export function groupsOf(plugins: InstalledPlugin[]): PluginGroup[] {
  const said = new Map(ORDER.map((one) => [one.key, one]))
  return grouped(
    ORDER.map((one) => one.key),
    plugins,
    keyOf,
    'yours',
  ).map((group) => ({
    key: group.key,
    title: said.get(group.key)!.title,
    note: said.get(group.key)!.note,
    titled: group.titled,
    plugins: group.members,
  }))
}
