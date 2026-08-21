import { useEffect, useState } from 'react'
import type { StatusState } from '@/entities/agent-session'
import { StatusDrawer } from '@/widgets/status-bar'
import { UsageBar } from '@/widgets/usage-bar'
import { useCliUpdate } from '../../model/use-cli-update'
import type { useConnectors } from '../../model/use-connectors'

export function StatusBarPanel({
  shown,
  status,
  wires,
  nowMs,
  open,
  onToggle,
}: {
  shown: boolean
  status: StatusState
  wires: ReturnType<typeof useConnectors>
  nowMs: number
  open: boolean
  onToggle(): void
}) {
  const cliUpdate = useCliUpdate(status.session?.cliVersion ?? null)
  const [appVersion, setAppVersion] = useState<string | null>(null)

  useEffect(() => {
    void window.desk
      .appVersion()
      .then(setAppVersion)
      .catch(() => undefined)
  }, [])

  if (!shown) return null

  return (
    <UsageBar
      status={status}
      connectors={wires.connectors}
      checked={wires.checked}
      nowMs={nowMs}
      open={open}
      onToggle={onToggle}
      details={
        <StatusDrawer
          appVersion={appVersion}
          statusState={status}
          connectors={wires.connectors}
          checked={wires.checked}
          checking={wires.loading}
          onRecheck={wires.reload}
          onUpdate={cliUpdate.start}
          updating={cliUpdate.updating}
        />
      }
    />
  )
}
