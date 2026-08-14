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
      <span className="w-[92px] flex-none font-mono text-[11px] opacity-70">{label}</span>
      <span className="min-w-0 flex-1 font-mono text-[11px] tabular-nums [overflow-wrap:anywhere]">
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
    <div className="zt-scroll flex max-h-[min(40vh,340px)] flex-none flex-col gap-3 overflow-y-auto pt-2 pr-2">
      {session && (
        <div className="flex flex-col gap-1">
          {known(session.id) && <Row label="세션">{session.id.slice(0, 8)}</Row>}
          {known(session.cwd) && <Row label="자리">{session.cwd}</Row>}
          <Row label="모델">{session.model}</Row>
          {known(session.permissionMode) && <Row label="권한 모드">{session.permissionMode}</Row>}
          {known(session.outputStyle) && <Row label="출력 스타일">{session.outputStyle}</Row>}
          <Row label="빠른 모드">
            {session.fastMode.state}
            {session.fastMode.reason ? ` — ${session.fastMode.reason}` : ''}
          </Row>
          {known(session.apiKeySource) && session.apiKeySource !== 'none' && (
            <Row label="API 키">{session.apiKeySource}</Row>
          )}
        </div>
      )}

      {(cost.usd > 0 || context.used > 0) && (
        <>
          <Separator className="opacity-30" />
          <div className="flex flex-col gap-1">
            <Row label="컨텍스트">
              {n(context.used)}
              {context.window ? ` / ${n(context.window)}` : ' (분모 미확인)'}
            </Row>
            <Row label="토큰">
              캐시읽기 {n(cost.tokens.cacheRead)} · 캐시생성 {n(cost.tokens.cacheCreate)} · 입력{' '}
              {n(cost.tokens.in)} · 출력 {n(cost.tokens.out)}
            </Row>
            <Row label="비용">
              ${cost.usd.toFixed(4)}
              {cost.lastTurnUsd > 0 ? ` (이 턴 $${cost.lastTurnUsd.toFixed(4)})` : ''}
            </Row>
            <Row label="턴">{n(cost.turns)}</Row>
            <Row label="걸린 시간">
              {(cost.durationMs / 1000).toFixed(1)}초
              {cost.ttftMs != null ? ` · 첫 응답 ${(cost.ttftMs / 1000).toFixed(1)}초` : ''}
            </Row>
          </div>
        </>
      )}

      {session && session.mcp.length > 0 && (
        <>
          <Separator className="opacity-30" />
          <div className="flex flex-col gap-1">
            {session.mcp.map((server) => (
              <Row key={server.name} label={server.name}>
                <span className={server.status === 'needs-auth' ? 'font-semibold' : 'opacity-70'}>
                  {mcpLabel(server.status)}
                </span>
              </Row>
            ))}
            <Row label="쓸 수 있는 것">
              도구 {n(session.counts.tools)} · 명령 {n(session.counts.commands)} · 에이전트{' '}
              {n(session.counts.agents)} · 스킬 {n(session.counts.skills)} · 플러그인{' '}
              {n(session.counts.plugins)}
            </Row>
          </div>
        </>
      )}

      {hasEnvironment && (
        <>
          <Separator className="opacity-30" />
          <div className="flex flex-col gap-1">
            {update?.current && (
              <Row label="CLI">
                <span className="flex flex-wrap items-center gap-2">
                  <span>
                    {update.current}
                    {update.latest === null
                      ? ' — 최신 여부 확인 못 함'
                      : stale
                        ? ` — 새 버전 ${update.latest}`
                        : ' — 최신'}
                    {update.managedBy ? ` (${update.managedBy})` : ''}
                  </span>
                  {stale && (
                    <Button size="sm" variant="outline" onClick={onUpdate} disabled={updating}>
                      {updating ? '갱신 중…' : '갱신하기'}
                    </Button>
                  )}
                </span>
              </Row>
            )}
            {session?.memoryPaths.map((path) => (
              <Row key={path} label="기억">
                {path}
              </Row>
            ))}
            {hooks.map((hook, index) => (
              <Row key={`${hook.name}-${index}`} label={index === 0 ? '훅' : ''}>
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
  if (status === 'connected') return '연결됨'
  if (status === 'needs-auth') return '인증 필요'
  if (status === 'pending') return '연결 중'
  return status
}
