import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { GlassPane } from '@/entities/glass'
import type { GlassTint } from '@/entities/glass'
import { MOTION, staggerDelay } from '@/shared/config/motion'
import type { UnitRect } from '@/shared/lib/luminance'
import { attentionId } from '../lib/attention'
import { observatoryLayout, soloRect } from '../lib/grid'
import type { Rect, Viewport } from '../lib/grid'
import type { DeckState } from '../model/deck-machine'
import { closingIds, visibleIds } from '../model/deck-machine'
import { AgentTile } from './AgentTile'

type TileDeckProps = {
  state: DeckState
  sessions: AgentSession[]
  /** 타일이 놓인 자리의 배경 밝기로 계산된 틴트 (스펙 §4.1) */
  tintFor(unit: UnitRect): GlassTint
  viewport: Viewport
  nowMs: number
  /**
   * 첫 판에 사는 것 — 사람과 에이전트의 대화다. 세션 타일과 달리 언제나 격자에 있다
   */
  terminal: ReactNode
  /** 대화 판의 틴트 */
  terminalTint: GlassTint
}

type PlacedTile = {
  session: AgentSession
  rect: Rect
  delayMs: number
  closing: boolean
}

export function TileDeck({
  state,
  sessions,
  tintFor,
  viewport,
  nowMs,
  terminal,
  terminalTint,
}: TileDeckProps) {
  const solo = soloRect(viewport)
  const advanced = useAdvancedFrame(state.kind)
  const sweeping = state.kind === 'fanning' || state.kind === 'merging'

  // fanning 은 solo 자리에서 한 프레임 머문 뒤 격자로 퍼진다 — 그래야 갈라지는 것으로 보인다
  const atGrid = state.kind === 'fanned' || (state.kind === 'fanning' && advanced)

  const gridSessions = findSessions(visibleIds(state), sessions)
  // 대화가 기둥을 잡고 서브에이전트가 곁에 쌓인다 — 일을 맡기는 자리는 하나다
  const placed = observatoryLayout(gridSessions.length, viewport)
  const terminalRect = atGrid ? placed.terminal : solo
  const tiles: PlacedTile[] = [
    ...gridSessions.map((session, index) => ({
      session,
      rect: atGrid ? (placed.sessions[index] ?? solo) : solo,
      delayMs: staggerDelay(index + 1),
      closing: false,
    })),
    // 닫히는 타일은 남은 한 장의 자리로 빨려든다. 스태거는 없다 — 자기 시계로 닫힌다
    ...findSessions(closingIds(state), sessions).map((session) => ({
      session,
      rect: solo,
      delayMs: 0,
      closing: true,
    })),
  ]

  // 셸이 시선의 주인을 정한다. 닫히는 타일은 후보가 아니다 — 물러나는 것이 시선을 끌 이유가 없다
  const attention = attentionId(gridSessions)

  const transitionMs = state.kind === 'merging' ? MOTION.mergeMs : MOTION.fanMs

  return (
    <div style={rootStyle}>
      {/* 대화 판. 자리와 크기만 움직이고 노드는 그대로다 */}
      <div
        data-terminal-tile
        style={{
          ...positionStyle,
          transform: `translate(${terminalRect.x}px, ${terminalRect.y}px)`,
          width: terminalRect.w,
          height: terminalRect.h,
          transition: [
            `transform ${transitionMs}ms ${MOTION.easing}`,
            `width ${transitionMs}ms ${MOTION.easing}`,
            `height ${transitionMs}ms ${MOTION.easing}`,
          ].join(', '),
        }}
      >
        <GlassPane tint={terminalTint} style={{ height: '100%', padding: 20 }}>
          {terminal}
        </GlassPane>
      </div>
      {tiles.map((tile) => (
        <AgentTile
          key={tile.session.id}
          session={tile.session}
          tint={tintFor(toUnit(tile.rect, viewport))}
          rect={tile.rect}
          delayMs={tile.delayMs}
          nowMs={nowMs}
          sweeping={sweeping}
          closing={tile.closing}
          attention={!tile.closing && tile.session.id === attention}
        />
      ))}
    </div>
  )
}

/**
 * kind 가 바뀐 다음 프레임에 true 가 된다. 두 프레임이 있어야 CSS 전환이 걸린다.
 * 상태 대신 "어느 kind 에서 프레임을 넘겼는지" 를 들고 있는 이유는, 새 kind 의 첫 렌더에서
 * 반드시 false 여야 하기 때문이다 — boolean 을 effect 에서 되돌리면 한 프레임 늦는다.
 */
function useAdvancedFrame(kind: DeckState['kind']): boolean {
  const [advancedKind, setAdvancedKind] = useState<DeckState['kind'] | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAdvancedKind(kind))
    return () => cancelAnimationFrame(frame)
  }, [kind])

  return advancedKind === kind
}

function findSessions(ids: string[], sessions: AgentSession[]): AgentSession[] {
  return ids
    .map((id) => sessions.find((session) => session.id === id))
    .filter((session): session is AgentSession => session !== undefined)
}

function toUnit(rect: Rect, viewport: Viewport): UnitRect {
  return {
    x: rect.x / viewport.w,
    y: rect.y / viewport.h,
    w: rect.w / viewport.w,
    h: rect.h / viewport.h,
  }
}

const rootStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 1 }

const positionStyle: CSSProperties = { position: 'absolute', top: 0, left: 0 }
