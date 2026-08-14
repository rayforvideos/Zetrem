import { describe, expect, it } from 'vitest'
import { formatTokens, limitKindLabel } from './units'

describe('formatTokens: a sense of size', () => {
  it('shows anything under a thousand as it is', () => {
    expect(formatTokens(500)).toBe('500')
  })

  it('folds a thousand and over into k', () => {
    expect(formatTokens(148200)).toBe('148.2k')
  })
})

describe('limitKindLabel: what a limit is called', () => {
  it('gives a known kind the name people use', () => {
    expect(limitKindLabel('seven_day')).toBe('Weekly')
    expect(limitKindLabel('five_hour')).toBe('5-hour')
  })

  it('passes an unknown kind through, rather than inventing a name for it', () => {
    expect(limitKindLabel('unknown_kind')).toBe('unknown_kind')
  })
})

describe('limitKindLabel: the names on the account limits', () => {
  it('names the weekly limit for what it is', () => {
    expect(limitKindLabel('seven_day')).toBe('Weekly')
    expect(limitKindLabel('seven_day_oauth')).toBe('Weekly')
  })

  it('keeps the model apart when the limit is per model', () => {
    expect(limitKindLabel('seven_day_opus')).toBe('Weekly Opus')
    expect(limitKindLabel('seven_day_sonnet')).toBe('Weekly Sonnet')
  })

  it('passes a kind it has never seen through untouched', () => {
    expect(limitKindLabel('thirty_day')).toBe('thirty_day')
  })
})
