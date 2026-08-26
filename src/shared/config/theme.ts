export const GROUND = { dark: '#000000', light: '#ffffff' } as const

export const CONTROL_SYMBOL = { dark: '#ededf0', light: '#1a1a1a' } as const

export const TRAFFIC_LIGHT = { x: 18, y: 18, size: 14 } as const

export const CHROME_TOP = TRAFFIC_LIGHT.y * 2 + TRAFFIC_LIGHT.size + 8

export const SHELL_PAD = 28

export const GRID_PAD = 20

export const WINDOWS_CONTROLS_WIDTH = 138

export const MIN_WINDOW = { width: 720, height: 520 } as const

export const USAGE_BAR = { height: 30 } as const

export const SIDEBAR = { width: 232, min: 176, max: 420, step: 16, gap: 28, gutter: 16 } as const
