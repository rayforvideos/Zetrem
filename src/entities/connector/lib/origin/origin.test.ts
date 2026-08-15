import { describe, expect, it } from 'vitest'
import { originLine, originOf, removableConnector, shortName } from './origin'

describe('where a connector came from decides what you can do to it', () => {
  it('knows one a plugin brought along', () => {
    expect(originOf('plugin:nx:nx-mcp')).toBe('plugin')
    expect(originLine('plugin:nx:nx-mcp')).toBe('brought by a plugin')
  })

  it('knows one that lives on your account', () => {
    expect(originOf('claude.ai Figma')).toBe('account')
    expect(originLine('claude.ai Figma')).toBe('from your Claude account')
  })

  it('says nothing extra about one you added yourself', () => {
    expect(originOf('playwright')).toBe('yours')
    expect(originLine('playwright')).toBeNull()
  })

  it('only offers to remove the ones this machine actually configured', () => {
    expect(removableConnector('playwright')).toBe(true)
    expect(removableConnector('api-explorer')).toBe(true)
    expect(removableConnector('plugin:nx:nx-mcp')).toBe(false)
    expect(removableConnector('claude.ai Slack')).toBe(false)
  })

  it('is not fooled by a name that merely contains the words', () => {
    expect(originOf('my-plugin:thing')).toBe('yours')
    expect(originOf('not-claude.ai Figma')).toBe('yours')
  })
})

describe('shortName: the group already said where it came from', () => {
  it('drops the prefix the heading repeats', () => {
    expect(shortName('claude.ai Figma')).toBe('Figma')
    expect(shortName('plugin:nx:nx-mcp')).toBe('nx:nx-mcp')
  })

  it('leaves a name you chose alone', () => {
    expect(shortName('playwright')).toBe('playwright')
    expect(shortName('api-explorer')).toBe('api-explorer')
  })

  it('is not fooled by a name that merely contains the words', () => {
    expect(shortName('my-plugin:thing')).toBe('my-plugin:thing')
    expect(shortName('not-claude.ai Figma')).toBe('not-claude.ai Figma')
  })
})
