import { describe, expect, it } from 'vitest'
import { CONTRACT_TIMEOUT_MS, ORCHESTRATOR_ONLY, askInit, askText } from './cli'

describe('what --agents does to the tools a session gets', () => {
  it(
    'gives a named agent every tool when the spec names none',
    async () => {
      const bare = await askInit()
      const led = await askInit(ORCHESTRATOR_ONLY)
      const builtin = (init: { tools: string[] }): string[] =>
        init.tools.filter((name) => !name.startsWith('mcp__')).sort()
      expect(builtin(led), 'tools 를 적지 않으면 전부 물려받아야 한다').toEqual(builtin(bare))
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
      expect(narrowed.tools.sort(), 'tools 는 허용 목록이지 추가 목록이 아니다').toEqual([
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
      expect(led.tools, '이름이 바뀌면 차단 목록도 따라 바뀌어야 한다').toContain('Task')
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'takes the crew tool away when Task is disallowed',
    async () => {
      const gone = await askInit([...ORCHESTRATOR_ONLY, '--disallowedTools', 'Task'])
      expect(gone.tools, 'Task 를 막으면 서브에이전트를 띄울 길이 사라진다').not.toContain('Task')
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
      expect(said, '나머지는 그대로 부를 수 있어야 한다').toMatch(/general-purpose/)
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

describe('the init event is a snapshot taken before the connectors are up', () => {
  it(
    'reports the remote connectors as not yet reachable',
    async () => {
      const init = await askInit()
      const remote = init.mcp.filter((one) => one.name.startsWith('claude.ai '))
      if (remote.length === 0) return
      expect(
        remote.every((one) => one.status !== 'connected'),
        'init 이 원격 커넥터를 connected 로 준다면 zetrem 의 회피는 이제 불필요하다',
      ).toBe(true)
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'brings no tools from a remote connector, however the health check reads',
    async () => {
      const init = await askInit()
      const servers = new Set(
        init.tools.filter((name) => name.startsWith('mcp__')).map((name) => name.split('__')[1]),
      )
      expect([...servers].some((name) => name?.startsWith('claude_ai_'))).toBe(false)
    },
    CONTRACT_TIMEOUT_MS,
  )

  it(
    'still lists the agents in full, since those are read from files',
    async () => {
      const init = await askInit()
      expect(init.agents.length).toBeGreaterThan(0)
    },
    CONTRACT_TIMEOUT_MS,
  )
})
