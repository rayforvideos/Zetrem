import type { ReactNode } from 'react'
import { isOutdated } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'

/**
 * 상태줄이 접어둔 전체 명세 — TUI 의 `/status` 와 `/mcp` 가 있던 자리다.
 *
 * 네 묶음(세션·계기·연결·환경)이 제목 없이 선다. 모르는 묶음은 그리지 않는다:
 * 빈 제목만 남은 묶음은 "정보가 없다" 가 아니라 "고장났다" 로 읽힌다.
 */
type StatusDrawerProps = {
  statusState: StatusState
  /** 사람이 갱신을 시작한다 — 앱이 알아서 설치하지 않는다 */
  onUpdate(): void
  updating: boolean
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="w-[92px] flex-none font-mono text-[11px] opacity-60">{label}</span>
      <span className="min-w-0 flex-1 font-mono text-[11px] tabular-nums [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  )
}

function n(value: number): string {
  return value.toLocaleString('ko-KR')
}

/** 파서가 필드를 못 채우면 빈 문자열로 온다 (fallback 없는 필드들) — 빈 문자열은 "모른다" 다 */
function known(value: string): string | null {
  return value.length > 0 ? value : null
}

export function StatusDrawer({ statusState, onUpdate, updating }: StatusDrawerProps) {
  const { session, context, cost, hooks, update } = statusState
  // 문자열 부등호(!==)로는 로컬이 더 새 빌드인 경우도 "새 버전 있음" 으로 오인한다 —
  // 실제로 뒤인지는 isOutdated 의 숫자 비교로만 판단한다 (StatusBar 의 cells() 와 같은 규칙)
  const stale = isOutdated(update?.current ?? null, update?.latest ?? null)

  // 환경 묶음의 재료 — 하나도 없으면 묶음 자체를 그리지 않는다 (모르는 것은 그리지 않는다)
  const hasEnvironment = Boolean(update?.current) || hooks.length > 0 || (session?.memoryPaths.length ?? 0) > 0

  return (
    // 40vh 는 뷰포트 기준이라, 판이 창보다 짧으면 서랍이 대화 자리를 통째로 먹는다 —
    // 창보다 짧은 판에서도 대화가 남게 절대 높이로 천장을 한 번 더 건다
    <div className="zt-scroll zt-enter flex max-h-[min(40vh,340px)] flex-none flex-col gap-3 overflow-y-auto pt-2 pr-2">
      {session && (
        <div className="flex flex-col gap-1">
          {/* id·cwd·permissionMode·outputStyle·apiKeySource 는 CLI init 이 안 주면 빈 문자열로 온다 —
              그때는 값이 없는 것이니 행 자체를 그리지 않는다 (model·fastMode.state 는 파서가 의미 있는
              폴백을 주므로 항상 선다) */}
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
                {/* 인증이 필요한 줄은 색이 아니라 말로 드러난다 */}
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
