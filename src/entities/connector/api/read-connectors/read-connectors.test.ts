import { describe, expect, it } from 'vitest'
import { canSignIn, needingAuth, readConnectors } from './read-connectors'
import type { Connector } from './read-connectors.types'

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

describe('canSignIn: which connectors have a sign in at all', () => {
  function one(where: string, state: Connector['state'], authByHeader = false): Connector {
    return { name: 'x', where, state, authByHeader }
  }

  it('offers it for a remote server, which is what signing in is for', () => {
    expect(canSignIn(one('https://mcp.asana.com/v2/mcp', 'needs-auth'))).toBe(true)
    expect(canSignIn(one('https://mcp.figma.com/mcp', 'connected'))).toBe(true)
  })

  it('does not offer it for a command on this machine, which has nothing to sign in to', () => {
    expect(canSignIn(one('npx @playwright/mcp@latest', 'connected'))).toBe(false)
    expect(canSignIn(one('npx nx-mcp@latest --minimal', 'connected'))).toBe(false)
  })

  it('does not offer it to a server still waiting to be approved, which signing in will not fix', () => {
    expect(canSignIn(one('https://mcp.example.com/mcp', 'unapproved'))).toBe(false)
  })

  it('does not offer it to a server that authenticates by a header, which has no sign in', () => {
    expect(canSignIn(one('https://api.githubcopilot.com/mcp/', 'failed', true))).toBe(false)
  })
})

describe('readConnectors: a server that authenticates by a header', () => {
  it('marks it, whether the header is missing, malformed or rejected', () => {
    const bad = readConnectors(
      'plugin:github:github: https://api.githubcopilot.com/mcp/ - ✘ Failed to connect — Authorization header is badly formatted',
    )
    expect(bad[0]).toMatchObject({ state: 'failed', authByHeader: true })
    const rejected = readConnectors(
      'g: https://x/mcp - ✘ Failed — OAuth fallback is disabled when headers.Authorization is set',
    )
    expect(rejected[0]?.authByHeader).toBe(true)
    expect(readConnectors('a: https://x/mcp - ✔ Connected')[0]?.authByHeader).toBe(false)
  })
})

describe('readConnectors: a server the CLI is holding for approval', () => {
  it('reads waiting for approval as its own state, rather than as unknown', () => {
    const [found] = readConnectors(
      'shadcn: npx shadcn@latest mcp - ⏸ Pending approval (run `claude` to approve)',
    )
    expect(found!.state).toBe('unapproved')
  })
})
