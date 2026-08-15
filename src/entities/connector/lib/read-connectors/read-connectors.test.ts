import { describe, expect, it } from 'vitest'
import { connectorSummary, needingAuth, readConnectors } from './read-connectors'

const REAL = `Checking MCP server health…

claude.ai Figma: https://mcp.figma.com/mcp - ✔ Connected
claude.ai Notion: https://mcp.notion.com/mcp - ! Needs authentication
plugin:nx:nx-mcp: npx nx-mcp@latest --minimal - ✔ Connected
playwright: npx @playwright/mcp@latest - ✔ Connected`

describe('readConnectors: reading what the CLI prints about connectors', () => {
  it('finds every server and nothing else in the output', () => {
    expect(readConnectors(REAL).map((one) => one.name)).toEqual([
      'claude.ai Figma',
      'claude.ai Notion',
      'plugin:nx:nx-mcp',
      'playwright',
    ])
  })

  it('keeps a name that has a colon in it, since plugin servers have two', () => {
    expect(readConnectors(REAL)[2]).toMatchObject({
      name: 'plugin:nx:nx-mcp',
      where: 'npx nx-mcp@latest --minimal',
    })
  })

  it('reads the tick as connected and the bang as needing you', () => {
    const [figma, notion] = readConnectors(REAL)
    expect(figma?.state).toBe('connected')
    expect(notion?.state).toBe('needs-auth')
  })

  it('calls a state it has never seen unknown rather than guessing connected', () => {
    expect(readConnectors('thing: http://x - ? Something new')[0]?.state).toBe('unknown')
  })

  it('reads a failure as a failure', () => {
    expect(readConnectors('thing: http://x - ✘ Failed to connect')[0]?.state).toBe('failed')
  })

  it('ignores the header and the blank lines around it', () => {
    expect(readConnectors('Checking MCP server health…\n\n')).toEqual([])
  })

  it('says nothing for empty output rather than inventing a server', () => {
    expect(readConnectors('')).toEqual([])
  })

  it('keeps the first reading when a name is printed twice', () => {
    const twice = readConnectors('a: x - ✔ Connected\na: y - ! Needs authentication')
    expect(twice).toHaveLength(1)
    expect(twice[0]?.where).toBe('x')
  })
})

describe('needingAuth: who is waiting on you', () => {
  it('picks out only the ones that need signing in', () => {
    expect(needingAuth(readConnectors(REAL)).map((one) => one.name)).toEqual(['claude.ai Notion'])
  })
})

describe('connectorSummary: one line about the connectors', () => {
  it('counts what is connected against what there is', () => {
    expect(connectorSummary(readConnectors(REAL))).toContain('3 of 4 connected')
  })

  it('says how many are waiting on you, since that is the actionable part', () => {
    expect(connectorSummary(readConnectors(REAL))).toContain('1 need signing in')
  })

  it('leaves the waiting clause out when nobody is waiting', () => {
    expect(connectorSummary(readConnectors('a: x - ✔ Connected'))).toBe('1 of 1 connected')
  })

  it('invites a first one when there is nothing at all', () => {
    expect(connectorSummary([])).toBe('No connectors yet')
  })
})
