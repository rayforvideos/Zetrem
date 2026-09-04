import { describe, expect, it } from 'vitest'
import { agentArgs, isReady, PROBE_BUDGET_USD, PROBE_PROMPT, probeArgs } from './run-config'

describe('agentArgs: what claude is started with', () => {
  const base = {
    permissionMode: 'ask' as const,
    lock: null,
    people: [],
    model: 'default' as const,
    effort: 'default' as const,
    persona: '말투',
  }

  it('routes permission questions to our own prompt in ask mode', () => {
    const args = agentArgs(base)
    expect(args).toContain('--permission-prompt-tool')
    expect(args).toContain('stdio')
    expect(args).not.toContain('--permission-mode')
  })

  it('hands auto-edit to the CLI mode instead of imitating it', () => {
    const args = agentArgs({ ...base, permissionMode: 'acceptEdits' })
    expect(args).toContain('--permission-mode')
    expect(args).toContain('acceptEdits')
    expect(args).toContain('--permission-prompt-tool')
  })

  it('hands plan mode to the CLI and keeps the prompt, since the plan itself is asked about', () => {
    const args = agentArgs({ ...base, permissionMode: 'plan' })
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('plan')
    expect(args).toContain('--permission-prompt-tool')
  })

  it('removes the prompt entirely for allow-all, because the CLI refuses both together', () => {
    const args = agentArgs({ ...base, permissionMode: 'bypass' })
    expect(args).toContain('--dangerously-skip-permissions')
    expect(args).not.toContain('--permission-prompt-tool')
  })

  it('passes a chosen effort and leaves it to the CLI on default', () => {
    const args = agentArgs({ ...base, effort: 'high' })
    expect(args.slice(args.indexOf('--effort'), args.indexOf('--effort') + 2)).toEqual([
      '--effort',
      'high',
    ])
    expect(agentArgs(base)).not.toContain('--effort')
  })

  it('passes a chosen model and leaves the choice to the CLI on default', () => {
    expect(agentArgs({ ...base, model: 'haiku' })).toContain('haiku')
    expect(agentArgs(base)).not.toContain('--model')
  })

  it('always adds the persona, because the first line of a reply is the first line on screen', () => {
    const args = agentArgs(base)
    expect(args).toContain('--append-system-prompt')
    expect(args).toContain('말투')
  })

  it('asks for partial messages, or a long answer arrives all at once', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      lock: null,
      people: [],
      model: 'default',
      effort: 'default',
      persona: '',
    })
    expect(args).toContain('--include-partial-messages')
  })
})

describe('isReady: whether work can be handed over yet', () => {
  it('needs both an account and a project', () => {
    expect(isReady({ loggedIn: true, project: '/p' })).toBe(true)
    expect(isReady({ loggedIn: false, project: '/p' })).toBe(false)
    expect(isReady({ loggedIn: true, project: null })).toBe(false)
  })
})

describe('the lock: only the people we hired can be called', () => {
  it('sets up our own orchestrator and narrows who it may call', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      effort: 'default' as const,
      persona: '말투',
      people: [
        {
          name: 'scout',
          description: '찾는다',
          prompt: '찾아라',
          model: null,
          tools: [],
          isolated: true,
        },
      ],
      lock: { blockedAgents: [] },
    })
    expect(args).toContain('--agent')
    expect(args[args.indexOf('--agent') + 1]).toBe('zetrem')
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] as string)
    expect(spec.zetrem).not.toHaveProperty('tools')
    expect(args[args.indexOf('--disallowedTools') + 1]).toContain('Workflow')
  })

  it('leaves the CLI default orchestrator alone when not locking', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      effort: 'default' as const,
      persona: '말투',
      people: [
        {
          name: 'scout',
          description: '찾는다',
          prompt: '찾아라',
          model: null,
          tools: [],
          isolated: true,
        },
      ],
      lock: null,
    })
    expect(args).toContain('--agents')
    expect(args).not.toContain('--agent')
  })
})

describe('what a locked orchestrator is told', () => {
  it('gives it the orchestrator brief and not just a voice, because a voice cannot do the job', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      effort: 'default' as const,
      persona: '말투',
      orchestrator: '너는 오케스트레이터다',
      people: [
        {
          name: 'scout',
          description: '찾는다',
          prompt: '찾아라',
          model: null,
          tools: [],
          isolated: true,
        },
      ],
      lock: { blockedAgents: [] },
    })
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] as string)
    expect(spec.zetrem.prompt).toBe('너는 오케스트레이터다')
    expect(args).toContain('말투')
  })

  it('falls back to the persona, because an empty brief makes the CLI ignore the definition', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      effort: 'default' as const,
      persona: '말투',
      people: [
        {
          name: 'scout',
          description: '찾는다',
          prompt: '찾아라',
          model: null,
          tools: [],
          isolated: true,
        },
      ],
      lock: { blockedAgents: [] },
    })
    expect(JSON.parse(args[args.indexOf('--agents') + 1] as string).zetrem.prompt).toBe('말투')
  })
})

describe('probeArgs: asking what the session would be, without starting one', () => {
  const base = {
    permissionMode: 'ask' as const,
    model: 'default' as const,
    effort: 'default' as const,
    people: [],
    lock: null,
    persona: 'P',
  }

  it('passes the prompt on the command line, since nothing will be written to stdin', () => {
    const args = probeArgs(base)
    expect(args).not.toContain('--input-format')
    expect(args[args.indexOf('-p') + 1]).toBe(PROBE_PROMPT)
  })

  it('caps what it may spend, so an answer can never be paid for', () => {
    const args = probeArgs(base)
    expect(args[args.indexOf('--max-budget-usd') + 1]).toBe(PROBE_BUDGET_USD)
  })

  it('skips the token stream, which nobody is watching it write', () => {
    expect(probeArgs(base)).not.toContain('--include-partial-messages')
  })

  it('asks in the same shape the real session runs in, or the answer would not match', () => {
    const args = probeArgs({
      ...base,
      model: 'opus',
      effort: 'default',
      permissionMode: 'acceptEdits',
    })
    expect(args).toContain('--verbose')
    expect(args[args.indexOf('--model') + 1]).toBe('opus')
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('acceptEdits')
  })

  it('never picks up an old conversation, because it is only asking about the setup', () => {
    expect(probeArgs({ ...base, resume: 'abc-123' })).not.toContain('--resume')
  })
})

describe('a teammate is given a working tree of its own where git can hold one', () => {
  const base = {
    permissionMode: 'ask' as const,
    model: 'default' as const,
    effort: 'default' as const,
    persona: '말투',
    people: [
      {
        name: 'scout',
        description: '찾는다',
        prompt: '찾아라',
        model: null,
        tools: [],
        isolated: true,
      },
    ],
    lock: { blockedAgents: [] },
  }

  it('branches those trees from the HEAD the person is looking at', () => {
    const args = agentArgs({ ...base, isolated: true })
    expect(args[args.indexOf('--settings') + 1]).toBe('{"worktree":{"baseRef":"head"}}')
  })

  it('writes the fence onto every teammate definition, not onto the orchestrator', () => {
    const args = agentArgs({ ...base, isolated: true })
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] as string)
    expect(spec.scout).toHaveProperty('isolation', 'worktree')
    expect(spec.zetrem).not.toHaveProperty('isolation')
  })

  it('asks for nothing where there is no repository to branch from', () => {
    const off = agentArgs({ ...base, isolated: false })
    expect(off).not.toContain('--settings')
    expect(JSON.parse(off[off.indexOf('--agents') + 1] as string).scout).not.toHaveProperty(
      'isolation',
    )
    expect(agentArgs(base), 'unsaid is the same as not a repository').not.toContain('--settings')
  })

  it('probes in the shape the real session runs in, fence and all', () => {
    const args = probeArgs({ ...base, isolated: true })
    expect(args[args.indexOf('--settings') + 1]).toBe('{"worktree":{"baseRef":"head"}}')
    expect(probeArgs(base)).not.toContain('--settings')
  })
})
