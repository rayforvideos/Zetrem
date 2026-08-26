import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type SurfaceProps = {
  bare?: boolean
  style?: CSSProperties
  children: ReactNode
}

export function Surface({ bare = false, style, children }: SurfaceProps) {
  return (
    <div
      data-surface
      className={cn(
        'relative overflow-hidden text-foreground',
        !bare && 'rounded-[18px] border border-border bg-card',
      )}
      style={style}
    >
      <div style={contentStyle}>{children}</div>
    </div>
  )
}

const contentStyle: CSSProperties = {
  position: 'relative',
  height: '100%',
}
