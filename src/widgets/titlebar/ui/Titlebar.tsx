import type { CSSProperties, ReactNode } from 'react'
import { CHROME_TOP, SHELL_PAD, TRAFFIC_LIGHT, WINDOWS_CONTROLS_WIDTH } from '@/shared/config/theme'
import { inShell, isMac } from '@/shared/lib/platform/platform'

type TitlebarProps = {
  left?: ReactNode
  children?: ReactNode
}

export function Titlebar({ left, children }: TitlebarProps) {
  // Room is left for window buttons only where there are window buttons.
  const shell = inShell()
  const mac = isMac() && shell
  return (
    <div
      data-titlebar
      style={{ ...rootStyle, paddingRight: shell && !mac ? WINDOWS_CONTROLS_WIDTH : SHELL_PAD }}
    >
      <div
        style={{
          ...leftStyle,
          alignSelf: mac ? 'flex-start' : 'center',
          height: mac ? TRAFFIC_LIGHT.y * 2 + TRAFFIC_LIGHT.size : '100%',
          paddingLeft: mac ? TRAFFIC_LIGHT.x * 2 + TRAFFIC_LIGHT.size * 3 + 22 : 16,
        }}
      >
        {left}
      </div>
      <div
        style={{
          ...rowStyle,
          alignSelf: mac ? 'flex-start' : 'center',
          height: mac ? TRAFFIC_LIGHT.y * 2 + TRAFFIC_LIGHT.size : '100%',
        }}
      >
        {children}
      </div>
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
  justifyContent: 'space-between',
}

const leftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  height: '100%',
}
