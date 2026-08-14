import type { CSSProperties } from 'react'
import { FALLBACK_BACKDROP } from '../model/backdrop'
import type { Backdrop } from '../model/backdrop'

type BackdropLayerProps = {
  backdrop: Backdrop | null
  /** 배경에 덮는 검정 막 (0–1). 사람이 직접 밀 때만 올라간다 — 기본은 0 이다 */
  dim?: number
}

export function BackdropLayer({ backdrop, dim = 0 }: BackdropLayerProps) {
  return (
    <>
      <div
        data-backdrop-layer
        style={
          backdrop
            ? {
                ...layerStyle,
                backgroundImage: `url("${backdrop.url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { ...layerStyle, background: FALLBACK_BACKDROP.gradient }
        }
      />
      {/*
        검정 막. 사진 전체를 어둡게 하고 싶은 사람을 위한 수동 노브다 — 유리는 이것 없이도
        제 자리의 배경만 눌러서 어두워진다(brightness). 유리 계산도 이 막을 포함한 밝기로
        하므로 화면과 어긋나지 않는다
      */}
      {dim > 0 && (
        <div
          data-backdrop-dim
          style={{ ...layerStyle, background: '#000', opacity: dim, transition: 'opacity 400ms ease' }}
        />
      )}
    </>
  )
}

const layerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
}
