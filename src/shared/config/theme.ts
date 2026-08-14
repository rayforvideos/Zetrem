export const GROUND = '#000000'

export const CONTROL_SYMBOL = '#ededf0'

export const TRAFFIC_LIGHT = { x: 18, y: 18, size: 14 } as const

export const CHROME_TOP = TRAFFIC_LIGHT.y * 2 + TRAFFIC_LIGHT.size + 8

export const SHELL_PAD = 28

export const GRID_PAD = 20

export const WINDOWS_CONTROLS_WIDTH = 138

export const SIDEBAR = { width: 232, gap: 28 } as const

export const SIDEBAR_SPAN = SIDEBAR.width + SIDEBAR.gap
