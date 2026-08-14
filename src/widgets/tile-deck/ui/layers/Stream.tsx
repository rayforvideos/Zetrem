import type { CSSProperties } from 'react'

type StreamProps = { lines: string[] }

/** 2층 — 흐르는 것. 읽으라고 있는 게 아니라 살아있다는 증거다 (스펙 §5.2) */
export function Stream({ lines }: StreamProps) {
  const shown = lines.slice(-8)
  return (
    <div style={rootStyle}>
      {shown.map((line, index) => (
        <div
          key={`${index}-${line}`}
          style={{
            ...lineStyle,
            // 오래된 줄일수록 옅어져 흐름의 방향이 읽힌다
            opacity: 0.25 + (0.75 * (index + 1)) / shown.length,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  // 흐름은 바닥에 붙는다 — 위에서 아래로 흐르는 것이 시간의 방향이다
  marginTop: 'auto',
  paddingTop: 12,
  fontFamily: 'var(--zt-mono)',
  fontSize: 10.5,
  lineHeight: 1.75,
  /**
   * 2층 전체 밝기. 스펙 §5.2 는 60% 였으나 실사용 피드백(2026-08-13)으로 70% 로 올렸다 —
   * 흐르는 층이지만 방금 지나간 두어 줄은 읽히기를 기대하게 된다.
   * 줄 수를 14→10 으로 줄여 시각적 밀도는 오히려 낮췄다.
   */
  opacity: 0.7,
  overflow: 'hidden',
  maskImage: 'linear-gradient(180deg, transparent 0%, #000 30%, #000 100%)',
}

const lineStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
}
