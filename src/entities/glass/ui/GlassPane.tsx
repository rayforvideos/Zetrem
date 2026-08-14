import type { CSSProperties, ReactNode } from 'react'
import { MOTION } from '@/shared/config/motion'
import { GLASS_SATURATE } from '../model/tint'
import type { GlassTint } from '../model/tint'

type GlassPaneProps = {
  tint: GlassTint
  /**
   * 유리 *뒤* 에 깔리는 것 — 블러 위, 표면 틴트 아래 (스펙 §5.3).
   * 표면이 덮으므로 "유리 뒤" 의 감쇠는 받되, 블러보다 뒤에 그려져 흐려지지는 않는다.
   * 블러 아래 두면 15px 숫자가 24px 블러를 못 견뎌 "초점을 맞추면 읽힌다" 가 죽는다.
   */
  behind?: ReactNode
  style?: CSSProperties
  children: ReactNode
}

/**
 * 아래에서 위로: 블러 → 3층(behind) → 표면 틴트 → 스크림 → 1·2층.
 * `backdrop-filter` 는 자기보다 먼저 그려진 것을 샘플링하므로,
 * 3층을 블러 뒤에 두어야 배경만 흐려지고 3층은 또렷하게 남는다.
 */
export function GlassPane({ tint, behind, style, children }: GlassPaneProps) {
  // 컴포넌트 언어(global.css .zt-*)가 쓰는 두 변수 — 색의 진실은 틴트 하나다
  const vars = {
    '--zt-text': tint.text,
    '--zt-on-primary': tint.surfaceSolid,
  } as CSSProperties
  return (
    <div style={{ ...shellStyle, ...vars, color: tint.text, ...style }}>
      <div
        style={{
          ...blurStyle,
          // 채도를 올려야 뒤의 색이 살아 유리로 읽힌다 — 블러만 걸면 안개가 된다.
          // brightness 는 유리가 덮은 자리의 배경만 누른다 — 어둡기를 알파로 만들지 않는 이유다
          backdropFilter: glassFilter(tint),
          WebkitBackdropFilter: glassFilter(tint),
        }}
      />
      {behind !== undefined && (
        // 3층의 밝기는 유리가 정한다 — 표면이 얼마나 삼키는지 아는 쪽이 여기다 (스펙 §5.3)
        <div data-behind style={{ ...behindStyle, opacity: tint.behindOpacity }}>
          {behind}
        </div>
      )}
      <div data-glass-surface style={{ ...surfaceStyle, backgroundColor: tint.surface }} />
      {/* 광택 — 위에서 비껴 든 빛. 평평한 색판을 유리로 만드는 마지막 한 겹이다.
          최대 5% 백색이라 §4.2 대비 보증의 여유(수 배)를 흔들지 못한다 */}
      <div style={sheenStyle} />
      {tint.scrimAlpha > 0 && <div data-scrim style={{ ...scrimStyle, opacity: tint.scrimAlpha }} />}
      <div style={contentStyle}>{children}</div>
    </div>
  )
}

/** 유리가 배경에 거는 것 전부 — 흐리고, 색을 살리고, 어두운 유리면 눌러 준다 */
function glassFilter(tint: GlassTint): string {
  const press = tint.backdropBrightness === 1 ? '' : ` brightness(${tint.backdropBrightness})`
  return `blur(${tint.blurPx}px) saturate(${GLASS_SATURATE})${press}`
}

const shellStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 18,
  // 테두리도 유리의 색을 따른다 — 흰 선은 밝은 유리 위에서 사라진다
  border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
  // 위 모서리의 빛 한 줄과 낮게 깔리는 그림자 — 유리판의 두께와 높이.
  // backdrop-filter 를 건드리지 않는 바깥 그림자라 블러와 다투지 않는다
  // 위 모서리에 반짝, 아래 모서리에 그늘, 그리고 바닥으로 떨어지는 그림자.
  // 유리판의 두께는 이 세 줄이 만든다 — 알파로 만들면 우윳빛 판이 된다
  boxShadow: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.35)',
    'inset 0 -1px 0 rgba(0, 0, 0, 0.12)',
    '0 24px 60px -20px rgba(0, 0, 0, 0.45)',
  ].join(', '),
  // 틴트는 배경 밝기를 따라 변한다. 갈아치우면 극성 반전이 번쩍이므로 건너가게 한다 (스펙 §4.1)
  transition: `color ${MOTION.tintMs}ms ${MOTION.easing}`,
}

const blurStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
}

const behindStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
}

const surfaceStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  pointerEvents: 'none',
  transition: `background-color ${MOTION.tintMs}ms ${MOTION.easing}`,
}

const sheenStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  background:
    'linear-gradient(150deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 26%, transparent 52%)',
  pointerEvents: 'none',
}

/** 텍스트 뒤에만 까는 그라디언트. 타일 전체를 어둡게 하지 않는다 (스펙 §4.2) */
const scrimStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 3,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
  pointerEvents: 'none',
}

const contentStyle: CSSProperties = {
  position: 'relative',
  zIndex: 4,
  height: '100%',
}
