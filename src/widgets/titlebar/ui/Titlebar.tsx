import type { CSSProperties, ReactNode } from 'react'
import { GlassPane } from '@/entities/glass'
import type { GlassTint } from '@/entities/glass'
import type { UnitRect } from '@/shared/lib/luminance'

type TitlebarProps = {
  /** 이 띠가 놓인 자리의 배경 밝기로 계산된 틴트 — 사진 위에서도 읽혀야 한다 */
  tint: GlassTint
  /** 항상 닿아야 하는 조작들. Fan 중에도 여기 있는 것은 눌린다 (스펙 §4.3) */
  children?: ReactNode
}

/**
 * 프레임리스 + 투명 창이므로 OS 가 닫기 버튼을 주지 않는다 (스펙 §6.5).
 * macOS 는 ⌘Q 가 있지만 Windows·Linux 에는 창을 닫을 방법이 아예 없다.
 *
 * 띠 자체는 아무것도 그리지 않는다 — 배경 사진 위에 얹히는 가구가 되지 않기 위해서다.
 * 보이는 것은 오른쪽 끝의 작은 유리 알약뿐이고, 나머지는 잡아 끌 수 있는 빈 영역이다.
 * 드래그 지정은 global.css 의 `[data-titlebar]` 가 한다.
 */
export function Titlebar({ tint, children }: TitlebarProps) {
  return (
    <div data-titlebar style={rootStyle}>
      <GlassPane tint={tint} style={pillStyle}>
        <div style={rowStyle}>
          {children}
          <button
            type="button"
            aria-label="창 닫기"
            title="창 닫기"
            onClick={() => window.desk.closeWindow()}
            className="zt-btn zt-btn--ghost"
            style={closeStyle}
          >
            ✕
          </button>
        </div>
      </GlassPane>
    </div>
  )
}

/**
 * 알약이 놓이는 자리의 근사 사각형. 폭이 내용에 따라 변하므로 틴트는 오른쪽 위 띠로 잡는다.
 * 틴트가 한 칸 옆의 밝기를 쓰는 정도의 오차는 대비 보증을 흔들지 않는다 — 보증은 유리 알파가 진다.
 */
export const TITLEBAR_UNIT_RECT: UnitRect = { x: 0.55, y: 0, w: 0.45, h: 0.06 }

const rootStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 40,
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: 12,
}

const pillStyle: CSSProperties = {
  borderRadius: 15,
  padding: '0 6px 0 12px',
  height: 30,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  height: '100%',
}

const closeStyle: CSSProperties = {
  width: 22,
  height: 22,
  padding: 0,
  borderRadius: 11,
  fontSize: 12,
}
