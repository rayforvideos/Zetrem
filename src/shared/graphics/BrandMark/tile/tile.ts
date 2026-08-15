import type { Tile } from './tile.types'

const DARK_BRAND = 0.09

const LIGHT = '#ffffff'
const DARK = '#000000'

function contrast(a: number, b: number): number {
  const [high, low] = a > b ? [a, b] : [b, a]
  return (high + 0.05) / (low + 0.05)
}

export function luminanceOf(hex: string): number {
  const said = hex.replace('#', '')
  if (said.length !== 6) return 0.5
  const channel = (at: number): number => {
    const raw = Number.parseInt(said.slice(at, at + 2), 16) / 255
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

export function tileOf(hex: string): Tile {
  const light = luminanceOf(hex)
  if (light < DARK_BRAND) return { bg: LIGHT, ink: hex }
  const onDark = contrast(light, 0)
  const onLight = contrast(light, 1)
  return { bg: hex, ink: onDark >= onLight ? DARK : LIGHT }
}
