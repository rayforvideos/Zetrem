import { describe, expect, it } from 'vitest'
import { barsOf, heightOf, widthOf } from './work-trace'

describe('widthOf: how long the call took, as a width', () => {
  it('gives a call that returned at once the narrowest mark', () => {
    expect(widthOf(0)).toBe(2)
  })

  it('grows with the wait', () => {
    expect(widthOf(1000)).toBeGreaterThan(widthOf(100))
    expect(widthOf(20_000)).toBeGreaterThan(widthOf(1000))
  })

  it('stops growing past a minute, so one long call cannot eat the strip', () => {
    expect(widthOf(60_000)).toBe(16)
    expect(widthOf(3_600_000)).toBe(16)
  })

  it('separates a quick read from a slow build by eye', () => {
    expect(widthOf(30_000) - widthOf(50)).toBeGreaterThanOrEqual(8)
  })
})

describe('heightOf: what the call was, as a height', () => {
  it('stands a summoned teammate tallest, since that is the biggest move', () => {
    expect(heightOf('Agent Explore')).toBeGreaterThan(heightOf('Bash npm test'))
  })

  it('stands writing above reading, because writing changes your files', () => {
    expect(heightOf('Edit a.ts')).toBeGreaterThan(heightOf('Read a.ts'))
  })

  it('keeps running level with writing, since both can change things', () => {
    expect(heightOf('Bash npm test')).toBe(heightOf('Write a.ts'))
  })

  it('keeps looking low, whether in files or on the web', () => {
    expect(heightOf('Grep foo')).toBe(heightOf('WebSearch foo'))
    expect(heightOf('Grep foo')).toBe(heightOf('Read a.ts'))
  })

  it('gives a line it cannot read a mark anyway', () => {
    expect(heightOf('무언가 이상한 줄')).toBeGreaterThan(0)
  })
})

describe('barsOf: the strip', () => {
  it('keeps one bar per call, in order', () => {
    const bars = barsOf([
      { line: 'Read a.ts', ms: 20, failed: false, running: false },
      { line: 'Bash npm test', ms: 30_000, failed: false, running: false },
    ])
    expect(bars).toHaveLength(2)
    expect(bars[1]!.width).toBeGreaterThan(bars[0]!.width)
  })

  it('marks a call that has not come back as running', () => {
    expect(barsOf([{ line: 'Bash sleep 30', ms: 4000, failed: false, running: true }])[0]!.running).toBe(true)
  })

  it('carries the failure through', () => {
    expect(barsOf([{ line: 'Bash exit 1', ms: 40, failed: true, running: false }])[0]!.failed).toBe(true)
  })
})
