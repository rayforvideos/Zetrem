import type { CSSProperties, ReactNode } from 'react'
import { CHROME_TOP } from '@/shared/config/theme'

type TitlebarProps = {
  children?: ReactNode
}

export function Titlebar({ children }: TitlebarProps) {
  return (
    <div data-titlebar style={rootStyle}>
      <div style={rowStyle}>{children}</div>
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: CHROME_TOP,
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: 12,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  height: '100%',
}
