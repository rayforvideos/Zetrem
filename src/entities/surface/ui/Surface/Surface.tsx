import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type SurfaceProps = {
  behind?: ReactNode
  bare?: boolean
  style?: CSSProperties
  children: ReactNode
}

export function Surface({ behind, bare = false, style, children }: SurfaceProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden text-foreground',
        !bare && 'rounded-[18px] border border-border',
      )}
      style={style}
    >
      {behind !== undefined && (
        <div data-behind style={behindStyle}>
          {behind}
        </div>
      )}
      {!bare && <div data-surface className="absolute inset-0 z-[2] bg-card" />}
      <div style={contentStyle}>{children}</div>
    </div>
  )
}

const behindStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
}

const contentStyle: CSSProperties = {
  position: 'relative',
  zIndex: 4,
  height: '100%',
}
