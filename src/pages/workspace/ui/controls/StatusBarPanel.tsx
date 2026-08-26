import { useEffect, useState } from 'react'
import type { StatusState } from '@/entities/agent-session'
import { StatusDrawer } from '@/widgets/status-bar'
import { UsageBar } from '@/widgets/usage-bar'
import { useCliUpdate } from '../../model/session/useCliUpdate'
import type { useConnectors } from '../../model/extensions/useConnectors'

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
    let alive = true
    void window.desk
      .appVersion()
      .then((version) => {
        if (alive) setAppVersion(version)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
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
