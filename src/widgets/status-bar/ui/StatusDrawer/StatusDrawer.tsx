import type { ReactNode } from 'react'
import { isOutdated } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'

type StatusDrawerProps = {
  statusState: StatusState
  onUpdate(): void
  updating: boolean
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="w-[92px] flex-none font-mono text-xs text-muted-foreground">{label}</span>
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

export function StatusDrawer({ statusState, onUpdate, updating }: StatusDrawerProps) {
  const { session, context, cost, hooks, update } = statusState
  const stale = isOutdated(update?.current ?? null, update?.latest ?? null)

  const hasEnvironment = Boolean(update?.current) || hooks.length > 0 || (session?.memoryPaths.length ?? 0) > 0

  return (
    <div data-selectable className="zt-scroll flex max-h-[min(40vh,340px)] flex-none flex-col gap-3 overflow-y-auto px-2 pt-2">
      {session && (
        <div className="flex flex-col gap-1">
          {known(session.id) && <Row label="Session">{session.id.slice(0, 8)}</Row>}
          {known(session.cwd) && <Row label="Working folder">{session.cwd}</Row>}
          <Row label="Model">{session.model}</Row>
          {known(session.permissionMode) && <Row label="Permission mode">{session.permissionMode}</Row>}
          {known(session.outputStyle) && <Row label="Output style">{session.outputStyle}</Row>}
          <Row label="Fast mode">
            {session.fastMode.state}
            {session.fastMode.reason ? `: ${session.fastMode.reason}` : ''}
          </Row>
          {known(session.apiKeySource) && session.apiKeySource !== 'none' && (
            <Row label="API key">{session.apiKeySource}</Row>
          )}
        </div>
      )}

      {(cost.usd > 0 || context.used > 0) && (
        <>
          <Separator />
          <div className="flex flex-col gap-1">
            <Row label="Context">
              {n(context.used)}
              {context.window ? ` / ${n(context.window)}` : ' (window unknown)'}
            </Row>
            <Row label="Tokens">
              cache read {n(cost.tokens.cacheRead)} · cache write {n(cost.tokens.cacheCreate)} · in{' '}
              {n(cost.tokens.in)} · out {n(cost.tokens.out)}
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
          </div>
        </>
      )}

      {session && session.mcp.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-1">
            {session.mcp.map((server) => (
              <Row key={server.name} label={server.name}>
                <span className={server.status === 'needs-auth' ? 'text-foreground' : 'text-muted-foreground'}>
                  {mcpLabel(server.status)}
                </span>
              </Row>
            ))}
            <Row label="Available">
              {n(session.counts.tools)} tools · {n(session.counts.commands)} commands ·{' '}
              {n(session.counts.agents)} agents · {n(session.counts.skills)} skills ·{' '}
              {n(session.counts.plugins)} plugins
            </Row>
          </div>
        </>
      )}

      {hasEnvironment && (
        <>
          <Separator />
          <div className="flex flex-col gap-1">
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
                  {stale && (
                    <Button size="sm" variant="outline" onClick={onUpdate} disabled={updating}>
                      {updating ? 'Updating…' : 'Update'}
                    </Button>
                  )}
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
          </div>
        </>
      )}
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
