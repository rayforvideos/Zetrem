import { beforeAll, describe, expect, it } from 'vitest'
import { CONTRACT_TIMEOUT_MS, ORCHESTRATOR_ONLY, askInit, askText } from './cli'

// Three tools carry no mcp__ prefix and are not built in either: the CLI adds
// them when a server that serves resources answers in time. Two sessions race
// the same connectors, so comparing them raw compares the race, not the spec.
const FROM_MCP = new Set(['ListMcpResourcesTool', 'ReadMcpResourceTool', 'ReadMcpResourceDirTool'])

// What init calls a server. A state outside this list is one the status bar
// has no words for, and it would reach the screen as the raw string.
const STATES = new Set(['connected', 'pending', 'needs-auth', 'failed'])

describe('what --agents does to the tools a session gets', () => {
  it(
    'gives a named agent every tool when the spec names none',
    async () => {
      const bare = await askInit()
      const led = await askInit(ORCHESTRATOR_ONLY)
      const builtin = (init: { tools: string[] }): string[] =>
        init.tools.filter((name) => !name.startsWith('mcp__') && !FROM_MCP.has(name)).sort()
      expect(builtin(led), 'naming no tools inherits all of them').toEqual(builtin(bare))
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'takes every other tool away the moment the spec names any',
    async () => {
      const narrowed = await askInit([
        '--agents',
        JSON.stringify({ zetrem: { description: 'o', prompt: 'x', tools: ['Bash', 'Read'] } }),
        '--agent',
        'zetrem',
      ])
      expect(narrowed.tools.sort(), 'tools is a list of what is allowed, not what is added').toEqual([
        'Bash',
        'Read',
      ])
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'still hands over the connector tools when the spec names none',
    async () => {
      const led = await askInit(ORCHESTRATOR_ONLY)
      expect(led.tools.some((name) => name.startsWith('mcp__'))).toBe(true)
    },
    CONTRACT_TIMEOUT_MS,
  )
})

describe('Task and Agent are one tool under two names', () => {
  it(
    'lists the crew tool as Task, whatever the model calls it in conversation',
    async () => {
      const led = await askInit(ORCHESTRATOR_ONLY)
      expect(led.tools, 'a renamed teammate takes the barred list with it').toContain('Task')
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'takes the crew tool away when Task is disallowed',
    async () => {
      const gone = await askInit([...ORCHESTRATOR_ONLY, '--disallowedTools', 'Task'])
      expect(gone.tools, 'barring Task leaves no way to send a subagent out').not.toContain('Task')
      expect(gone.tools).not.toContain('Agent')
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'leaves it in place when only the off screen tools are disallowed',
    async () => {
      const kept = await askInit([
        ...ORCHESTRATOR_ONLY,
        '--disallowedTools',
        'Workflow,SendMessage,ListAgents,RemoteTrigger',
      ])
      expect(kept.tools).toContain('Task')
      expect(kept.tools).not.toContain('Workflow')
    },
    CONTRACT_TIMEOUT_MS,
  )
})

describe('--disallowedTools narrows who may be called', () => {
  const NAMES =
    'Reply with ONLY the comma separated allowed values of subagent_type in your Agent tool. No prose.'

  it(
    'drops the named agent from the tool schema itself',
    async () => {
      const said = await askText(NAMES, [
        ...ORCHESTRATOR_ONLY,
        '--disallowedTools',
        'Agent(Explore)',
      ])
      expect(said).not.toMatch(/\bExplore\b/)
      expect(said, 'the rest stay callable').toMatch(/general-purpose/)
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'takes several at once from one comma separated value',
    async () => {
      const said = await askText(NAMES, [
        ...ORCHESTRATOR_ONLY,
        '--disallowedTools',
        'Agent(Explore),Agent(Plan)',
      ])
      expect(said).not.toMatch(/\bExplore\b/)
      expect(said).not.toMatch(/\bPlan\b/)
    },
    CONTRACT_TIMEOUT_MS,
  )
})

describe('the init event is a snapshot of connectors part way up', () => {
  // One session answers all three questions. Every one of them reads the same
  // snapshot, and the contract tests pay real money for each session they open.
  let init: { tools: string[]; agents: string[]; mcp: { name: string; status: string }[] }

  beforeAll(async () => {
    init = await askInit()
  }, CONTRACT_TIMEOUT_MS)

  // "claude.ai Gmail" is the server; mcp__claude_ai_Gmail__send_message is its
  // tool. Everything that is not a letter or a digit becomes an underscore.
  const asToolName = (name: string): string => name.replace(/[^A-Za-z0-9]/g, '_')
  const serversInTools = (): Set<string> =>
    new Set(init.tools.filter((name) => name.startsWith('mcp__')).map((name) => name.split('__')[1]!))

  it('gives every server a state the status bar knows how to draw', () => {
    const strange = init.mcp.filter((one) => !STATES.has(one.status))
    expect(
      strange.map((one) => `${one.name}=${one.status}`),
      '새 상태값이 생겼다면 상태바가 그것을 그대로 화면에 내보낸다',
    ).toEqual([])
  })

  it('has not heard back from every server it lists, which is why zetrem asks again', () => {
    if (init.mcp.length === 0) return
    expect(
      serversInTools().size,
      'init 이 모든 커넥터의 툴을 싣고 온다면 zetrem 의 헬스체크는 이제 불필요하다',
    ).toBeLessThan(init.mcp.length)
  })

  it('does hand over the tools of a remote connector it already reached', () => {
    const reached = init.mcp.filter(
      (one) => one.name.startsWith('claude.ai ') && one.status === 'connected',
    )
    if (reached.length === 0) return
    const servers = serversInTools()
    expect(
      reached.map((one) => asToolName(one.name)).filter((one) => !servers.has(one)),
      'a connector init calls connected arrives with its tools',
    ).toEqual([])
  })

  it('still lists the agents in full, since those are read from files', () => {
    expect(init.agents.length).toBeGreaterThan(0)
  })
})
