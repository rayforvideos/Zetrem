import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { TranscriptEntry } from '@/entities/agent-session'

type TranscriptProps = { entries: TranscriptEntry[] }

/**
 * 대화 전문 — 1층의 확장이다. 시선의 주인이 된 대기 타일에서만 펼쳐진다:
 * 답하려면(자유 문장이든 허용/거부든) 에이전트가 실제로 말한 것을 읽을 수 있어야 한다.
 * headline 은 요약이고 여기는 잘리지 않은 원문이다. 읽는 층이므로 애니메이션은 없다 (스펙 §3).
 */
export function Transcript({ entries }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 최신 말이 보이는 채로 열린다 — 스크롤 위치 지정이지 움직임 연출이 아니다
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries])

  return (
    <div data-transcript className="zt-scroll" ref={scrollRef} style={rootStyle}>
      {entries.map((entry, index) => (
        <div key={`${index}-${entry.role}`} style={entry.role === 'user' ? userStyle : undefined}>
          {entry.text}
        </div>
      ))}
    </div>
  )
}

/** 대비 보증 대상 — 밝기를 깎지 않는다 (스펙 §5.1) */
const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  marginTop: 10,
  maxHeight: '46%',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}

/** 사람의 말 — 누가 말했는지는 색이 아니라 들여쓰기와 선으로 가른다 */
const userStyle: CSSProperties = {
  borderLeft: '2px solid currentColor',
  paddingLeft: 8,
  opacity: 0.75,
}
