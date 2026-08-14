import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'

type HeadlineProps = {
  session: AgentSession
  /**
   * 요약 문장을 물러나게 한다 — 전문(Transcript)이 펼쳐진 타일에서 같은 말이
   * 두 번 보이면 안 된다. 정체성(이름·모델)은 언제나 남는다.
   */
  withText?: boolean
}

/** 1층 — 읽는 것. 전면, 최대 명료도, 애니메이션 없음 (스펙 §5.1) */
export function Headline({ session, withText = true }: HeadlineProps) {
  return (
    <div style={rootStyle}>
      <div style={nameStyle}>
        {/* 상태는 점 하나로 — 글자로 쓰면 이름과 다툰다 (스펙 §6) */}
        <span data-dot style={dotStyle(session.status)} />
        <span style={labelStyle}>{session.label}</span>
        <span style={modelStyle}>{session.model}</span>
      </div>
      {withText && session.headline.length > 0 && (
        <div style={textStyle}>{session.headline}</div>
      )}
    </div>
  )
}

/**
 * 작업 중은 맥동하는 점, 대기는 속이 빈 고리, 끝난 것은 잔잔한 점.
 * 색을 들이지 않는다 — currentColor 의 농도만 다르다 (스펙 §4.2)
 */
function dotStyle(status: AgentSession['status']): CSSProperties {
  const base: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: 3,
    flex: '0 0 auto',
    alignSelf: 'center',
  }
  if (status === 'working') {
    return { ...base, background: 'currentColor', animation: 'tile-pulse 2.4s ease-in-out infinite' }
  }
  if (status === 'waiting') {
    return { ...base, border: '1.5px solid currentColor', background: 'transparent' }
  }
  return { ...base, background: 'currentColor', opacity: 0.35 }
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  // 오른쪽 위는 3층(텔레메트리)의 자리다 — 이름이 그 밑으로 파고들지 않게 비운다
  paddingRight: 150,
}

const nameStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 7,
  fontSize: 12.5,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  minWidth: 0,
}

/** 이름이 길어도 줄을 넘기지 않는다 — 머리글은 한 줄이다 */
const labelStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

/**
 * 정체성은 글자다 (스펙 §6) — 그래서 1층이고, 4.5:1 보증 대상이다 (스펙 §5.1).
 * 밝기를 깎으면 보증한 색을 깎는 것이 되어 실제 대비가 절반으로 내려간다.
 * 덜 중요하다는 신호는 크기와 굵기로만 준다.
 */
const modelStyle: CSSProperties = { fontSize: 11, fontWeight: 400, letterSpacing: '0.04em' }

/**
 * 지금 하는 일 한 줄. 세 줄에서 자른다 — 타일은 문서가 아니라 상태판이고,
 * 긴 말은 전문(Transcript)이 맡는다
 */
const textStyle: CSSProperties = {
  marginTop: 8,
  // 자식의 말도 에이전트의 말이다 — 같은 활자로 (대화 판과 한 화면에 있으므로)
  fontFamily: 'var(--zt-serif)',
  fontSize: 14.5,
  lineHeight: 1.5,
  letterSpacing: '-0.011em',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}
