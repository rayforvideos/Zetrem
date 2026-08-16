import type { ReactNode } from 'react'
import { isOutdated, updateCommand } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import { Button } from '@/shared/ui/button'
import { shortName } from '@/entities/connector'
import type { Connector } from '@/entities/connector'
import { useScrollState } from '@/shared/lib/scroll-state/use-scroll-state'

type StatusDrawerProps = {
  statusState: StatusState
  connectors: Connector[]
  checking: boolean
  onRecheck(): void
  onUpdate(): void
  updating: boolean
}

const CONNECTOR_STATE: Record<string, string> = {
  connected: 'Connected',
  'needs-auth': 'Needs auth',
  unapproved: 'Waiting for approval',
  failed: 'Failed',
  unknown: 'Unknown',
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
      <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3.5 py-3">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-[124px] flex-none truncate font-mono text-xs text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 font-mono text-xs tabular-nums [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  )
}

function n(value: number): string {
  return value.toLocaleString('ko-KR')
}

function known(value: string): string | null {
  return value.length > 0 ? value : null
}

export function StatusDrawer({
  statusState,
  connectors,
  checking,
  onRecheck,
  onUpdate,
  updating,
}: StatusDrawerProps) {
  const [body] = useScrollState<HTMLDivElement>()
  const { session, context, cost, hooks, update } = statusState

  const stale = isOutdated(update?.current ?? null, update?.latest ?? null)
  const byHand = updateCommand(update?.managedBy ?? null)
  const hasRun = cost.usd > 0 || context.used > 0
  const hasEnvironment =
    Boolean(update?.current) || hooks.length > 0 || (session?.memoryPaths.length ?? 0) > 0

  return (
    <div data-status-drawer className="flex max-h-[min(58vh,560px)] min-h-0 flex-col">
      <div className="flex-none px-4 pt-3 pb-2">
        <span className="text-xs tracking-[0.08em] text-muted-foreground">This session</span>
      </div>

      <div
        ref={body}
        data-selectable
        className="zt-scroll zt-fade-y flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-1 pb-4"
      >
          {session && (
            <Part title="Session">
              {known(session.id) && <Row label="Session">{session.id.slice(0, 8)}</Row>}
              {known(session.cwd) && <Row label="Working folder">{session.cwd}</Row>}
              <Row label="Model">{session.model}</Row>
              {known(session.permissionMode) && (
                <Row label="Permission mode">{session.permissionMode}</Row>
              )}
              {known(session.outputStyle) && <Row label="Output style">{session.outputStyle}</Row>}
              <Row label="Fast mode">
                {session.fastMode.state}
                {session.fastMode.reason ? `: ${session.fastMode.reason}` : ''}
              </Row>
              {known(session.apiKeySource) && session.apiKeySource !== 'none' && (
                <Row label="API key">{session.apiKeySource}</Row>
              )}
            </Part>
          )}

          {hasRun && (
            <Part title="This chat">
              <Row label="Context">
                {n(context.used)}
                {context.window ? ` / ${n(context.window)}` : ' (window unknown)'}
              </Row>
              <Row label="Tokens">
                cache read {n(cost.tokens.cacheRead)} · cache write {n(cost.tokens.cacheCreate)} ·
                in {n(cost.tokens.in)} · out {n(cost.tokens.out)}
              </Row>
              <Row label="Cost">
                ${cost.usd.toFixed(4)}
                {cost.lastTurnUsd > 0 ? ` (this turn $${cost.lastTurnUsd.toFixed(4)})` : ''}
              </Row>
              <Row label="Turns">{n(cost.turns)}</Row>
              <Row label="Duration">
                {(cost.durationMs / 1000).toFixed(1)}s
                {cost.ttftMs != null ? ` · first token ${(cost.ttftMs / 1000).toFixed(1)}s` : ''}
              </Row>
            </Part>
          )}

          {(connectors.length > 0 || (session?.mcp.length ?? 0) > 0) && (
            <Part
              title="Connectors"
              aside={
                <Button
                  variant="quiet"
                  size="bare"
                  onClick={onRecheck}
                  disabled={checking}
                  className="text-xs"
                >
                  {checking ? 'Checking…' : 'Recheck'}
                </Button>
              }
            >
              {connectors.length > 0
                ? connectors.map((connector) => (
                    <Row key={connector.name} label={shortName(connector.name)}>
                      <span
                        className={
                          connector.state === 'connected'
                            ? 'text-muted-foreground'
                            : 'text-foreground'
                        }
                      >
                        {CONNECTOR_STATE[connector.state] ?? connector.state}
                      </span>
                    </Row>
                  ))
                : (session?.mcp ?? []).map((server) => (
                    <Row key={server.name} label={shortName(server.name)}>
                      <span
                        className={
                          server.status === 'needs-auth'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {mcpLabel(server.status)}
                      </span>
                    </Row>
                  ))}
              {session && (
                <Row label="Available">
                  {n(session.counts.tools)} tools · {n(session.counts.commands)} commands ·{' '}
                  {n(session.counts.agents)} agents · {n(session.counts.skills)} skills ·{' '}
                  {n(session.counts.plugins)} plugins
                </Row>
              )}
            </Part>
          )}

          {hasEnvironment && (
            <Part title="Environment">
              {update?.current && (
                <Row label="CLI">
                  <span className="flex flex-wrap items-center gap-2">
                    <span>
                      {update.current}
                      {update.latest === null
                        ? ', could not check for updates'
                        : stale
                          ? `, update available: ${update.latest}`
                          : ', up to date'}
                      {update.managedBy ? ` (${update.managedBy})` : ''}
                    </span>
                    {stale &&
                      (byHand === null ? (
                        <Button size="sm" variant="outline" onClick={onUpdate} disabled={updating}>
                          {updating ? 'Updating…' : 'Update'}
                        </Button>
                      ) : (
                        <code className="rounded-md bg-background px-2 py-1 text-xs select-all">
                          {byHand}
                        </code>
                      ))}
                  </span>
                </Row>
              )}
              {session?.memoryPaths.map((path) => (
                <Row key={path} label="Memory">
                  {path}
                </Row>
              ))}
              {hooks.map((hook, index) => (
                <Row key={`${hook.name}-${index}`} label={index === 0 ? 'Hooks' : ''}>
                  {hook.name} · {hook.exitCode} · {hook.ms}ms
                </Row>
              ))}
            </Part>
        )}
      </div>
    </div>
  )
}

function mcpLabel(status: string): string {
  switch (status) {
    case 'connected':
      return 'Connected'
    case 'needs-auth':
      return 'Needs auth'
    case 'pending':
      return 'Connecting'
    default:
      return status
  }
}
