import { useState } from 'react'
import { PluginShelf } from '@/widgets/setup'
import type { useConnectors } from '../../model/extensions/useConnectors'
import type { usePlugins } from '../../model/extensions/usePlugins'

export function PluginShelfOverlay({
  shelf,
  wires,
  project,
}: {
  shelf: ReturnType<typeof usePlugins>
  wires: ReturnType<typeof useConnectors>
  project: string | null
}) {
  const [tab, setTab] = useState('installed')

  if (!shelf.open) return null

  return (
    <PluginShelf
      connectors={wires.connectors}
      onAddConnector={wires.add}
      onImportConnectors={wires.importDesktop}
      adding={wires.adding}
      onConnector={wires.act}
      catalog={shelf.catalog}
      marketplaces={shelf.marketplaces}
      loading={tab === 'connectors' ? wires.loading : shelf.loading}
      browsing={shelf.browsing}
      onTab={(value) => {
        setTab(value)
        if (value === 'browse') shelf.browse()
      }}
      onAct={shelf.act}
      busy={shelf.busy ?? wires.busy}
      onReload={() => {
        if (tab === 'connectors') {
          wires.reload()
          return
        }
        if (tab === 'browse') {
          shelf.browse(true)
          return
        }
        shelf.reload()
      }}
      project={project}
      onClose={shelf.hide}
    />
  )
}
