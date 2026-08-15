import { describe, expect, it } from 'vitest'
import type { Connector } from '../read-connectors/read-connectors.types'
import { connectorGroupsOf } from './groups'

function connector(name: string): Connector {
  return { name, where: 'npx thing', state: 'connected' }
}

describe('connectorGroupsOf: a connector sits with the others it shares a fate with', () => {
  it('keeps the order yours, your account, from plugins', () => {
    const groups = connectorGroupsOf([
      connector('plugin:nx:nx-mcp'),
      connector('claude.ai Figma'),
      connector('playwright'),
    ])
    expect(groups.map((group) => group.key)).toEqual(['yours', 'account', 'plugin'])
  })

  it('leaves out a group nobody is in', () => {
    const groups = connectorGroupsOf([connector('playwright'), connector('api-explorer')])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.connectors).toHaveLength(2)
  })

  it('says nothing when they are all yours', () => {
    expect(connectorGroupsOf([connector('playwright')])[0]?.titled).toBe(false)
  })

  it('names the groups as soon as there is more than one', () => {
    const groups = connectorGroupsOf([connector('playwright'), connector('claude.ai Figma')])
    expect(groups.every((group) => group.titled)).toBe(true)
  })

  it('tells you where the ones you cannot remove are managed instead', () => {
    const [group] = connectorGroupsOf([connector('claude.ai Slack')])
    expect(group?.note).toContain('claude.ai')
    expect(group?.titled).toBe(true)
  })

  it('has nothing to show for an empty list', () => {
    expect(connectorGroupsOf([])).toEqual([])
  })
})
