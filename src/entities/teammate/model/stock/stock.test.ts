import { describe, expect, it } from 'vitest'
import { ORCHESTRATOR } from '@/entities/claude-cli/@x/teammate'
import { allowedStock, offStock, stockAgents } from './stock'

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
    expect(
      stockAgents(known, ['Joi'], ['Ray']),
      'Ray was written by hand into .claude/agents',
    ).toEqual(['Explore', 'general-purpose', 'Plan'])
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

describe('allowedStock: everything of theirs except what was switched off', () => {
  const stock = ['Explore', 'Plan', 'general-purpose']

  it('drops the ones switched off', () => {
    expect(allowedStock(stock, ['Explore'])).toEqual(['Plan', 'general-purpose'])
  })

  it('allows all of theirs when nothing was switched off', () => {
    expect(allowedStock(stock, [])).toEqual(stock)
  })

  it('ignores an off switch for a name that is no longer theirs', () => {
    expect(allowedStock(stock, ['Explore', '사라진에이전트'])).toEqual(['Plan', 'general-purpose'])
  })

  it('follows the list order and not the order things were switched off', () => {
    expect(allowedStock(stock, ['general-purpose'])).toEqual(['Explore', 'Plan'])
  })
})

describe('which of their agents are on: everything except what you turned off', () => {
  const stock = ['claude', 'Explore', 'Plan']

  it('has them all on before anybody touches a switch', () => {
    // Nothing writes to say they are on. Being one of theirs is enough, so a
    // name that turns up later needs no write to be honest — and no write can
    // flip it on behind your back either.
    expect(allowedStock(stock, [])).toEqual(stock)
  })

  it('leaves out the ones turned off', () => {
    expect(allowedStock(stock, ['Explore'])).toEqual(['claude', 'Plan'])
  })

  it('ignores an off switch for something that is not theirs any more', () => {
    expect(allowedStock(stock, ['gone'])).toEqual(stock)
  })

  it('turns one off and on again without inventing anything', () => {
    const off = offStock([], 'Explore', false)
    expect(off).toEqual(['Explore'])
    expect(offStock(off, 'Explore', true)).toEqual([])
  })

  it('does not list the same name off twice', () => {
    expect(offStock(['Explore'], 'Explore', false)).toEqual(['Explore'])
  })
})
