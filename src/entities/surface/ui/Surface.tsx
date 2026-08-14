import type { CSSProperties, ReactNode } from 'react'
import { GROUND, TEXT } from '@/shared/config/theme'

const FILL = 'rgba(255, 255, 255, 0.035)'

type SurfaceProps = {
  behind?: ReactNode
  bare?: boolean
  style?: CSSProperties
  children: ReactNode
}

export function Surface({ behind, bare = false, style, children }: SurfaceProps) {
  const vars = {
    '--zt-text': TEXT,
    '--zt-on-primary': GROUND,
  } as CSSProperties
  return (
    <div style={{ ...(bare ? bareShellStyle : shellStyle), ...vars, color: TEXT, ...style }}>
      {behind !== undefined && (
        <div data-behind style={behindStyle}>
          {behind}
        </div>
      )}
      {!bare && <div data-surface style={surfaceStyle} />}
      <div style={contentStyle}>{children}</div>
    </div>
  )
}

const shellStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 18,
  border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
  boxShadow: 'none',
}

const bareShellStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
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
  backgroundColor: FILL,
}

const contentStyle: CSSProperties = {
  position: 'relative',
  zIndex: 4,
  height: '100%',
}
