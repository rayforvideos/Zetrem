import type { CSSProperties } from 'react'

export const positionStyle: CSSProperties = { position: 'absolute', top: 0, left: 0 }

export const CARD_MIN = 196

export const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  padding: 16,
}

export const youRowStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 4px 0',
}

export const youStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

export const youNameStyle: CSSProperties = { fontSize: 12.5 }

export const roleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  paddingInline: 8,
  paddingBlock: 2,
  borderRadius: 999,
  border: '1px solid var(--color-border)',
  fontSize: 11,
  letterSpacing: '0.02em',
  opacity: 0.75,
}

export const headStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  fontSize: 11.5,
  letterSpacing: '0.05em',
  opacity: 0.45,
}

export const cardsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN - 10}px, 1fr))`,
  gap: 10,
  alignContent: 'start',
  marginTop: 12,
  flex: '0 0 auto',
  maxHeight: '50%',
  overflowY: 'auto',
  paddingRight: 8,
  paddingBottom: 4,
}

export const laneListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  marginTop: 8,
  minHeight: 0,
  flex: '1 1 auto',
  paddingRight: 8,
  overflowY: 'auto',
}

export const detailStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minHeight: 0,
  flex: '1 1 auto',
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid var(--color-border)',
  overflow: 'hidden',
}

export const detailHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12.5,
  flex: '0 0 auto',
}

export const quietStyle: CSSProperties = { margin: 0, fontSize: 12, opacity: 0.45 }

export const detailNoteStyle: CSSProperties = {
  minWidth: 0,
  fontSize: 11.5,
  opacity: 0.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const laneStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  minWidth: 0,
  height: 'auto',
  padding: '7px 8px',
  borderRadius: 8,
  fontSize: 12,
  overflow: 'hidden',
  textAlign: 'left',
}

export const laneReachStyle: CSSProperties = {
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  borderRadius: 8,
  background: 'linear-gradient(to right, currentColor, transparent)',
  opacity: 0.09,
  pointerEvents: 'none',
}

export const laneFaceStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  display: 'flex',
}

export const laneNameStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  minWidth: 62,
}

export const laneIconStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  opacity: 0.7,
}

export const laneVerbStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  opacity: 0.8,
  maxWidth: '46%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const laneTargetStyle: CSSProperties = {
  position: 'relative',
  flex: '1 1 auto',
  minWidth: 0,
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const laneClockStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.5,
}

export function laneRoom(room: number): number {
  return Math.max(96, Math.min(220, Math.round(room * 0.45)))
}

export const laneOpenStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '2px 8px 12px 36px',
  minHeight: 0,
  overflow: 'hidden',
}
