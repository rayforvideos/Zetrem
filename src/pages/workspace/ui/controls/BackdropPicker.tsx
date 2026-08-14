import { useState } from 'react'
import type { CSSProperties } from 'react'
import { backdropStore, pickBackdrop } from '@/entities/backdrop'

export function BackdropPicker() {
  const [error, setError] = useState<string | null>(null)

  function handleClick(): void {
    setError(null)
    pickBackdrop()
      .then((backdrop) => {
        if (backdrop) backdropStore.set(backdrop)
      })
      .catch((cause: unknown) => {
        // 삼키면 사용자가 보는 것은 "눌렀는데 아무 일도 없다" 뿐이다.
        // 이 화면의 존재 이유가 배경이므로, 실패는 화면에 나와야 한다
        console.error('배경을 불러오지 못했다', cause)
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }

  return (
    <>
      <button type="button" onClick={handleClick} className="zt-btn zt-btn--ghost zt-btn--sm">
        배경 고르기
      </button>
      {error !== null && (
        <span role="alert" title={error} style={errorStyle}>
          배경 실패: {error}
        </span>
      )}
    </>
  )
}

/** 대비 보증 대상이라 밝기를 깎지 않는다 — 크기로만 줄인다 (스펙 §5.1) */
const errorStyle: CSSProperties = {
  fontSize: 12,
  maxWidth: 280,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
