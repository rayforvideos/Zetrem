import type { CSSProperties } from 'react'

export const ICON_W = 30

export const FRAME_W = ICON_W
export const FRAME_H = 20

export function motion(live: boolean, animation: string, origin?: string): CSSProperties {
  if (!live) return {}
  if (origin === undefined) return { animation }
  return { animation, transformBox: 'fill-box', transformOrigin: origin }
}

export const trackStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  background: 'linear-gradient(to right, currentColor, transparent)',
  opacity: 0.13,
  borderRadius: 5,
  pointerEvents: 'none',
}

export const rootStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  minWidth: 0,
  flex: '0 0 auto',
  padding: '3px 5px 3px 0',
  borderRadius: 5,
  fontSize: 11.5,
}

export const frameStyle: CSSProperties = {
  flex: '0 0 auto',
  width: FRAME_W,
  height: FRAME_H,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  transition: 'opacity 400ms ease',
}

export const summonStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: FRAME_W,
  height: FRAME_H,
}

export const ringStyle: CSSProperties = {
  position: 'absolute',
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: '1px solid currentColor',
  animation: 'zt-now-ring 2s ease-out infinite',
}

export const elapsedStyle: CSSProperties = {
  flex: '0 0 auto',
  marginLeft: 'auto',
  paddingLeft: 8,
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.5,
}

export const wordsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 7,
  flex: '1 1 auto',
  minWidth: 0,
}

export const verbStyle: CSSProperties = { flex: '0 0 auto' }

export const targetStyle: CSSProperties = {
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.75,
  flex: '1 1 auto',
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
