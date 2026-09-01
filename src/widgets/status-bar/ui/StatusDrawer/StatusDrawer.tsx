import type { ReactNode } from 'react'
import { isOutdated, updateCommand } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import { Button } from '@/shared/ui/button'
import { shortName } from '@/entities/connector'
import type { Connector } from '@/entities/connector'
import { useScrollState } from '@/shared/lib/scroll-state/useScrollState'
import { useAppUpdateCheck } from '../../model/useAppUpdateCheck'
import { reachable } from '../../lib/format/format'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'

type StatusDrawerProps = {
  appVersion: string | null
  statusState: StatusState
  connectors: Connector[]
  checked?: boolean
  checking: boolean
  onRecheck(): void
  onUpdate(): void
  updating: boolean
}

function Card({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3.5 py-3">{children}</div>
}

function Part({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs tracking-[0.08em] text-muted-foreground">{title}</h3>
        {aside}
      </div>
      <Card>{children}</Card>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-[96px] flex-none truncate font-mono text-xs text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 font-mono text-xs tabular-nums [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  )
}

function n(value: number): string {
  return value.toLocaleString(i18n.locale || undefined)
}

function known(value: string): string | null {
  return value.length > 0 ? value : null
}

function loud(mode: string): boolean {
  return known(mode) !== null && mode !== 'default'
}

export function StatusDrawer({
  appVersion,
  statusState,
  connectors,
  checked = true,
  checking,
  onRecheck,
  onUpdate,
  updating,
}: StatusDrawerProps) {
  const [body] = useScrollState<HTMLDivElement>()
  const appUpdate = useAppUpdateCheck()
  const { session, context, cost, update } = statusState

  const stale = isOutdated(update?.current ?? null, update?.latest ?? null)
  const byHand = updateCommand(update?.managedBy ?? null)
  const hasRun = cost.usd > 0 || context.used > 0

  const wired = checked ? [...reachable(statusState, connectors)] : []
  const trouble = wired.filter(([, state]) => state !== 'connected')
  const reached = wired.length - trouble.length

  return (
    <div data-status-drawer className="flex max-h-[min(58vh,560px)] min-h-0 flex-col">
      <div className="flex-none px-4 pt-3 pb-2">
        <span className="text-xs tracking-[0.08em] text-muted-foreground">{t`This session`}</span>
      </div>

      <div
        ref={body}
        data-selectable
        className="zt-scroll zt-fade-y flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-1 pb-4"
      >
        {(session !== null || hasRun) && (
          <Card>
            {session && known(session.cwd) && <Row label={t`Folder`}>{session.cwd}</Row>}
            {session && <Row label={t`Model`}>{session.model}</Row>}
            {session && loud(session.permissionMode) && (
              <Row label={t`Permission`}>{session.permissionMode}</Row>
            )}
            {hasRun && (
              <Row label={t`Context`}>
                {n(context.used)}
                {context.window ? ` / ${n(context.window)}` : ' (window unknown)'}
              </Row>
            )}
          </Card>
        )}

        {(wired.length > 0 || !checked) && (
          <Part
            title={t`Connectors`}
            aside={
              <Button
                variant="quiet"
                size="bare"
                onClick={onRecheck}
                disabled={checking}
                className="text-xs"
              >
                {checking ? t`Checking…` : t`Recheck`}
              </Button>
            }
          >
            {trouble.map(([name, state]) => (
              <Row key={name} label={shortName(name)}>
                {stateLabel(state)}
              </Row>
            ))}
            <div className="font-mono text-xs text-muted-foreground tabular-nums">
              {!checked
                ? t`Checking…`
                : trouble.length === 0
                  ? t`All ${n(reached)} connected`
                  : t`${n(reached)} of ${n(wired.length)} connected`}
            </div>
          </Part>
        )}

        {(appVersion !== null || update?.current) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-1 font-mono text-xs text-muted-foreground">
            {appVersion !== null && <span>Zetrem {appVersion}</span>}
            {appVersion !== null && (
              <Button
                size="sm"
                variant="ghost"
                onClick={appUpdate.ask}
                disabled={appUpdate.asking}
                className="h-6 px-2 text-muted-foreground text-xs"
                data-app-update-check
              >
                {appUpdate.asking ? t`Checking…` : t`Check for updates`}
              </Button>
            )}
            {appUpdate.note !== null && <span data-app-update-note>{appUpdate.note}</span>}
            {appVersion !== null && update?.current && <span aria-hidden>·</span>}
            {update?.current && (
              <span>
                CLI {update.current}
                {stale ? ` → ${update.latest}` : ''}
              </span>
            )}
            {stale &&
              (byHand === null ? (
                <Button size="sm" variant="outline" onClick={onUpdate} disabled={updating}>
                  {updating ? t`Updating…` : t`Update`}
                </Button>
              ) : (
                <code className="rounded-md bg-muted px-2 py-1 text-xs select-all">{byHand}</code>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function stateLabel(status: string): string {
  switch (status) {
    case 'needs-auth':
      return t`Needs auth`
    case 'pending':
      return t`Connecting`
    case 'unapproved':
      return t`Waiting for approval`
    case 'failed':
      return t`Failed`
    default:
      return t`Unknown`
  }
}
