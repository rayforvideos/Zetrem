import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The ratios in this file are computed, not copied from a picker, so a token
// cannot be nudged a little darker without the number moving with it.

type Oklch = { l: number; c: number; h: number }

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const b = c * Math.sin(hr)
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ]
}

function luminance(colour: Oklch): number {
  const [r, g, b] = oklchToLinearRgb(colour)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(front: Oklch, back: Oklch): number {
  const a = luminance(front)
  const b = luminance(back)
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

const CSS = readFileSync(join('src', 'app', 'styles', 'global.css'), 'utf8')
const DARK = CSS.indexOf('@media (prefers-color-scheme: dark)')

function tokens(from: number, to: number): Map<string, Oklch> {
  const found = new Map<string, Oklch>()
  const slice = CSS.slice(from, to)
  for (const [, name, l, c, h] of slice.matchAll(
    /(--[a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g,
  )) {
    if (name !== undefined && !found.has(name)) {
      found.set(name, { l: Number(l), c: Number(c), h: Number(h) })
    }
  }
  return found
}

const SCHEMES = [
  { name: 'light', of: tokens(0, DARK) },
  { name: 'dark', of: tokens(DARK, CSS.length) },
] as const

function ratio(scheme: (typeof SCHEMES)[number], front: string, back: string): number {
  const a = scheme.of.get(front)
  const b = scheme.of.get(back)
  if (a === undefined || b === undefined) throw new Error(`${front} or ${back} is not a token`)
  return contrast(a, b)
}

describe('the ratios the eye needs, held by the tokens rather than by hand', () => {
  it.each(SCHEMES)('reads a quiet row against the page in $name', (scheme) => {
    expect(ratio(scheme, '--muted-foreground', '--background')).toBeGreaterThanOrEqual(4.5)
  })

  it.each(SCHEMES)('reads a quiet row against a card in $name', (scheme) => {
    expect(ratio(scheme, '--muted-foreground', '--card')).toBeGreaterThanOrEqual(4.5)
  })

  it.each(SCHEMES)('shows which segment is chosen against its track in $name', (scheme) => {
    expect(ratio(scheme, '--chosen', '--card')).toBeGreaterThanOrEqual(3)
  })

  it.each(SCHEMES)('reads the label sitting on the chosen segment in $name', (scheme) => {
    expect(ratio(scheme, '--chosen-foreground', '--chosen')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('a quiet control is quiet by colour, not by a veil over it', () => {
  it('keeps opacity out of the quiet variant, where it cost a tool row 3.1:1', () => {
    const button = readFileSync(join('src', 'shared', 'ui', 'button.tsx'), 'utf8')
    const quiet = button.slice(
      button.indexOf('quiet:'),
      button.indexOf('},', button.indexOf('quiet:')),
    )
    expect(quiet).not.toMatch(/opacity-\d+/)
    expect(quiet).toContain('text-muted-foreground')
  })
})
