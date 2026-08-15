import { describe, expect, it } from 'vitest'
import {
  MODELS,
  PERMISSION_MODES,
  agentArgs,
  isReady,
  PROBE_BUDGET_USD,
  PROBE_PROMPT,
  probeArgs,
} from './run-config'

describe('agentArgs: what claude is started with', () => {
  const base = {
    permissionMode: 'ask' as const,
    lock: null,
    people: [],
    model: 'default' as const,
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

  it('removes the prompt entirely for allow-all, because the CLI refuses both together', () => {
    const args = agentArgs({ ...base, permissionMode: 'bypass' })
    expect(args).toContain('--dangerously-skip-permissions')
    expect(args).not.toContain('--permission-prompt-tool')
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

  it('leaves partial messages off, so words appear once they are finished', () => {
    const args = agentArgs({ permissionMode: 'ask' as const, lock: null, people: [], model: 'default', persona: '' })
    expect(args).not.toContain('--include-partial-messages')
  })

  it('gives every choice a label and a hint, since a name alone does not say what it sets', () => {
    expect(PERMISSION_MODES).toHaveLength(3)
    for (const choice of [...PERMISSION_MODES, ...MODELS]) {
      expect(choice.label.length).toBeGreaterThan(0)
      expect(choice.hint.length, choice.label).toBeGreaterThan(0)
    }
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
      persona: '말투',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
      lock: { knownTools: ['Read', 'Task'], alsoCallable: [] },
    })
    expect(args).toContain('--agent')
    expect(args[args.indexOf('--agent') + 1]).toBe('zetrem')
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] as string)
    expect(spec.zetrem.tools).toEqual(['Read', 'Agent(scout)'])
  })

  it('leaves the CLI default orchestrator alone when not locking', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      persona: '말투',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
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
      persona: '말투',
      orchestrator: '너는 오케스트레이터다',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
      lock: { knownTools: ['Read'], alsoCallable: [] },
    })
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] as string)
    expect(spec.zetrem.prompt).toBe('너는 오케스트레이터다')
    expect(args).toContain('말투')
  })

  it('falls back to the persona, because an empty brief makes the CLI ignore the definition', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      persona: '말투',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
      lock: { knownTools: ['Read'], alsoCallable: [] },
    })
    expect(JSON.parse(args[args.indexOf('--agents') + 1] as string).zetrem.prompt).toBe('말투')
  })
})

describe('probeArgs: asking what the session would be, without starting one', () => {
  const base = {
    permissionMode: 'ask' as const,
    model: 'default' as const,
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

  it('asks in the same shape the real session runs in, or the answer would not match', () => {
    const args = probeArgs({ ...base, model: 'opus', permissionMode: 'acceptEdits' })
    expect(args).toContain('--verbose')
    expect(args[args.indexOf('--model') + 1]).toBe('opus')
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('acceptEdits')
  })

  it('never picks up an old conversation, because it is only asking about the setup', () => {
    expect(probeArgs({ ...base, resume: 'abc-123' })).not.toContain('--resume')
  })
})
