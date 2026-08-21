import type { CSSProperties } from 'react'

export const splitStyle: CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'minmax(0, 65fr) minmax(0, 35fr)',
  gap: 14,
  flex: '1 1 auto',
  minHeight: 0,
}

export const paneStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
}

export const logPaneStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: 8,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
}

export const logHeadStyle: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 11.5,
  letterSpacing: '0.08em',
  color: 'var(--color-muted-foreground)',
}
