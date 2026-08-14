import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { GlassPane } from '@/entities/glass'
import type { GlassTint } from '@/entities/glass'
import { MOTION } from '@/shared/config/motion'
import type { Rect } from '../lib/grid'
import { Headline } from './layers/Headline'
import { Stream } from './layers/Stream'
import { Telemetry } from './layers/Telemetry'
import { Transcript } from './layers/Transcript'

type AgentTileProps = {
  session: AgentSession
  tint: GlassTint
  rect: Rect
  delayMs: number
  nowMs: number
  /** 갈라지거나 닫히는 중. 경계 섬광을 켜고 2층을 멈춘다 */
  sweeping?: boolean
  /**
   * 닫히는 중 — 자리를 내놓고 남은 한 장 쪽으로 빨려들며 흐려진다 (스펙 §2.3).
   * 물이 갈라지는 것과 같은 문법으로 닫힌다: 같은 이징, 같은 섬광, 반대 방향.
   */
  closing?: boolean
  /**
   * 이 타일이 지금 화면에서 시선의 주인인가 (스펙 §6 시선 규칙).
   * 대기 중이어도 주인이 아니면 맥동하지 않고 정적인 표시만 낸다.
   * 누가 주인인지는 타일이 알 수 없다 — 셸이 정해서 내려준다.
   */
  attention?: boolean
}

export function AgentTile({
  session,
  tint,
  rect,
  delayMs,
  nowMs,
  sweeping = false,
  closing = false,
  attention = false,
}: AgentTileProps) {
  /**
   * 전문은 시선의 주인에게만 펼친다 (스펙 §6). 관측기에서는 답할 일이 없으므로
   * 대기 조건이 사라졌다 — 지금 가장 볼 만한 타일이 자기 대화를 펼친다
   */
  const transcriptOpen = attention && session.transcript.length > 0
  const durationMs = closing ? MOTION.mergeMs : MOTION.fanMs
  // 닫히는 타일은 정의상 전환 중이다 — 섬광을 켜고 2층을 멈추는 규칙이 같이 적용된다
  const sweep = sweeping || closing
  return (
    <div
      data-status={session.status}
      data-closing={closing || undefined}
      style={{
        ...positionStyle,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
        opacity: closing ? 0 : 1,
        transition: [
          `transform ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `width ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `height ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `opacity ${MOTION.mergeMs}ms ${MOTION.easing} ${delayMs}ms`,
        ].join(', '),
      }}
    >
      <GlassPane
        tint={tint}
        // 3층은 유리 뒤다 — 표면 틴트와 블러 아래에 깔려 배경과 함께 흐려진다 (스펙 §5.3)
        behind={<Telemetry session={session} nowMs={nowMs} />}
        style={{ height: '100%', padding: 20 }}
      >
        {session.status === 'working' && !sweep && <div style={rippleStyle} />}
        {session.status === 'waiting' &&
          (attention ? (
            <div data-pulse style={pulseStyle} />
          ) : (
            <div data-waiting style={waitingMarkStyle} />
          ))}
        {sweep && <div data-sweep style={sweepStyle(durationMs)} />}
        <div style={bodyStyle}>
          <Headline session={session} withText={!transcriptOpen} />
          {transcriptOpen && <Transcript entries={session.transcript} />}
          {/* 전환 중에는 2층을 멈춘다 — 500ms 동안 움직임은 하나만 돈다 (스펙 §6.5) */}
          {!sweep && <Stream lines={session.stream} />}
        </div>
      </GlassPane>
    </div>
  )
}

/** 머리글은 위, 흐름은 아래 — 타일이 커져도 빈 가운데가 생기지 않는다 */
const bodyStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}

/**
 * `will-change` 를 두지 않는다. 특히 **`opacity` 를 넣으면 안 된다.**
 *
 * `will-change: opacity` 는 이 래퍼를 backdrop root 로 만들고, 그러면 안쪽 유리의
 * `backdrop-filter` 가 래퍼 바깥을 샘플링하지 못한다 — 배경 사진이 흐려지지 않고
 * 타일이 반투명 색판이 된다. 이 제품의 이름이 유리인데 유리가 사라진다.
 *
 * 실측으로 갈랐다 (배경에 하드 경계를 두고 타일 안 픽셀 한 줄을 읽음, 인접 최대 점프):
 *   transform 만                              → 2   (기울기, 블러 살아 있음)
 *   transform + will-change: transform,w,h    → 2   (기울기)
 *   transform + will-change: opacity          → 92  (계단, 블러 죽음)
 * `transform` 자체는 무죄다. 위치를 left/top 으로 바꿀 이유가 없다.
 */
const positionStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
}

/** 작업 중 타일의 표면 일렁임. 시선을 끌지 않는 강도로 유지한다 (스펙 §6) */
const rippleStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(120% 80% at 50% 120%, rgba(255,255,255,0.10) 0%, transparent 60%)',
  animation: 'tile-ripple 4.5s ease-in-out infinite',
  pointerEvents: 'none',
}

/**
 * 시선의 주인. 한 화면에 언제나 최대 하나다 (스펙 §6 시선 규칙).
 * 테두리 색이 currentColor 인 이유는 밝은 배경에서도 보여야 하기 때문이다 —
 * 흰 테두리는 밝은 유리 위에서 사라지고, 그러면 규칙이 반대 방향으로 깨진다
 */
const pulseStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 18,
  border: '1px solid currentColor',
  animation: 'tile-pulse 2.4s ease-in-out infinite',
  pointerEvents: 'none',
}

/**
 * 기다리지만 지금 시선의 주인이 아닌 타일.
 * 상태는 알려야 하고 시선은 끌지 않아야 하므로 **애니메이션 없이** 정적인 테두리만 낸다
 */
const waitingMarkStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 18,
  border: '1px solid currentColor',
  opacity: 0.3,
  pointerEvents: 'none',
}

/**
 * 경계 섬광 — 갈라진 선을 빛이 한 번 훑는다. "촥" 을 시각으로 낸 것 (스펙 §3).
 * 닫힐 때도 같은 빛이 훑는다. 지속시간만 그 전환의 것을 쓴다
 */
function sweepStyle(durationMs: number): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
    animation: `tile-sweep ${durationMs}ms ${MOTION.easing} 1`,
    pointerEvents: 'none',
    zIndex: 4,
  }
}
