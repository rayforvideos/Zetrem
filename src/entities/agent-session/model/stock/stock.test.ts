import { describe, expect, it } from 'vitest'
import { ORCHESTRATOR } from '../roster-lock/roster-lock'
import { allowedStock, stockAgents } from './stock'

const known = [
  'Explore',
  'general-purpose',
  'Ray',
  'Plan',
  ORCHESTRATOR,
  'Joi',
  'humanize-korean:humanize-monolith',
]

describe('stockAgents: what the session lists, minus our own, is what Claude Code brings', () => {
  it('leaves out the people we made and the orchestrator', () => {
    expect(stockAgents(known, ['Ray', 'Joi'])).toEqual(['Explore', 'general-purpose', 'Plan'])
  })

  it('leaves out one the person wrote themselves, which Claude Code did not bring', () => {
    expect(stockAgents(known, ['Joi'], ['Ray']), 'Ray 는 .claude/agents 에 직접 쓴 것이다').toEqual([
      'Explore',
      'general-purpose',
      'Plan',
    ])
  })

  it('keeps the builtins when the person wrote none', () => {
    expect(stockAgents(['Explore', 'Plan'], [], [])).toEqual(['Explore', 'Plan'])
  })

  it('matches a written name however the session spells its case', () => {
    expect(stockAgents(['Explore', 'Ray'], [], ['ray'])).toEqual(['Explore'])
  })

  it('writes no names down, and follows whatever the session gives', () => {
    expect(stockAgents(['Brand New Agent'], [])).toEqual(['Brand New Agent'])
  })

  it('leaves out anyone a plugin brought, so only what Claude Code has stands here', () => {
    expect(stockAgents(['Explore', 'nx:generate', 'im-not-ai:whoever'], [])).toEqual(['Explore'])
  })

  it('has nothing before a session has been seen', () => {
    expect(stockAgents([], ['Ray'])).toEqual([])
  })

  it('counts a repeated name once', () => {
    expect(stockAgents(['Explore', 'Explore'], [])).toEqual(['Explore'])
  })

  it('drops an empty name', () => {
    expect(stockAgents(['', 'Explore'], [])).toEqual(['Explore'])
  })
})

describe('allowedStock: only what is switched on can be called', () => {
  const stock = ['Explore', 'Plan', 'general-purpose']

  it('keeps only what is on', () => {
    expect(allowedStock(stock, ['Explore'])).toEqual(['Explore'])
  })

  it('allows nothing when nothing is on', () => {
    expect(allowedStock(stock, [])).toEqual([])
  })

  it('does not revive a name that is gone, even if the setting still lists it', () => {
    expect(allowedStock(stock, ['Explore', '사라진에이전트'])).toEqual(['Explore'])
  })

  it('follows the list order and not the order things were switched on', () => {
    expect(allowedStock(stock, ['general-purpose', 'Explore'])).toEqual(['Explore', 'general-purpose'])
  })
})
