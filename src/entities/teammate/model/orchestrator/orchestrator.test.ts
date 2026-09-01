import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { agentArgs } from '@/entities/claude-cli/@x/teammate'
import { ORCHESTRATOR, agentsArgs } from '@/entities/claude-cli/@x/teammate'
import { PERSONA, orchestratorPrompt } from './orchestrator'

const person = { name: 'Explore', description: '', prompt: '찾아본다', model: null, tools: [] }
const brief = orchestratorPrompt(true)
const briefs = [brief, orchestratorPrompt(false)]

describe('what the orchestrator is told', () => {
  it('names no language of its own, so the person picks it by speaking', () => {
    for (const one of briefs) {
      for (const tongue of ['korean', 'english', '한국어', '영어']) {
        expect(one.toLowerCase()).not.toContain(tongue)
      }
    }
  })

  it('does say to hand off in the language being spoken, which the roster otherwise loses', () => {
    // Behind the roster the CLI's handoff drifts to English. Naming the language
    // back restores the CLI's own behaviour rather than shaping the reply.
    for (const one of briefs) expect(one).toContain('the language the person is using')
  })

  it('never locks with an empty brief, since nothing told is nothing followed', () => {
    const args = agentsArgs([person], { blockedAgents: [] }, brief, true)
    const spec = JSON.parse(args[args.indexOf('--agents') + 1]!)
    expect(spec[ORCHESTRATOR].prompt).toBe(brief)
    expect(spec[ORCHESTRATOR].prompt.length).toBeGreaterThan(0)
  })

  it('is the brief the main process actually passes, so there are not two copies', async () => {
    const host = await readFile('electron/host/agent-host/agent-host.ts', 'utf8')
    expect(host).toContain('orchestratorPrompt')
    expect(host).not.toContain('agent-style')
  })

  it('adds the same brief unlocked, so locking does not change how it speaks', () => {
    const args = agentArgs({
      permissionMode: 'ask',
      model: 'default',
      effort: 'default',
      persona: brief,
      people: [person],
      lock: null,
    })
    expect(args[args.indexOf('--append-system-prompt') + 1]).toBe(brief)
  })

  it('passes no empty flag when there is nothing to add', () => {
    const args = agentArgs({
      permissionMode: 'ask',
      model: 'default',
      effort: 'default',
      persona: '',
      people: [],
      lock: null,
    })
    expect(args).not.toContain('--append-system-prompt')
  })
})

describe('the app does not shape the answer itself', () => {
  const said = `${PERSONA} ${briefs.join(' ')}`.toLowerCase()

  it('never asks for a line narrating what it is about to do', () => {
    for (const phrase of ['open every reply', 'one sentence saying what you are doing']) {
      expect(
        said,
        'a sentence Zetrem puts in front is an answer the CLI would not have given',
      ).not.toContain(phrase)
    }
  })

  it('never renames the assistant, since the answer should read as Claude Code', () => {
    expect(said).not.toContain('you are zeta')
  })

  it('adds nothing at all outside the orchestrator, so a plain session is untouched', () => {
    expect(PERSONA).toBe('')
  })

  it('still says how to hand work to a teammate, which is the app working, not the answer', () => {
    for (const one of briefs) expect(one).toContain('subagent_type')
  })
})

describe('what the orchestrator is told about the tree everyone is working in', () => {
  const isolated = orchestratorPrompt(true)
  const alone = orchestratorPrompt(false)

  it('says where a teammate leaves its work when the runtime can fence one off', () => {
    expect(isolated).toContain('worktree')
    expect(isolated).toContain('worktree-<name>')
    expect(isolated).toContain('.claude/worktrees/')
  })

  it('makes it the one that merges what comes back, one branch at a time', () => {
    expect(isolated).toContain('merge')
    expect(isolated.toLowerCase()).toContain('one branch at a time')
  })

  it('asks for a merge commit of its own, so one teammate can be undone alone', () => {
    expect(isolated).toContain('--no-ff')
  })

  it('takes away the commands that wiped the last run, while anyone is out', () => {
    for (const command of ['checkout', 'reset', 'clean', 'stash']) {
      expect(isolated, command).toContain(command)
    }
  })

  it('says none of that where nothing could enforce it', () => {
    for (const word of ['worktree', 'merge', '.claude/worktrees/']) {
      expect(alone, word).not.toContain(word)
    }
  })

  it('asks instead for one writer at a time, which is all a prompt can promise', () => {
    expect(alone).toContain('not a git repository')
    expect(alone).toContain('one write task at a time')
    expect(alone.toLowerCase()).toContain('parallel')
  })

  it('never tells a repository it is not one', () => {
    expect(isolated).not.toContain('not a git repository')
  })

  it('keeps everything the orchestrator was already told, either way', () => {
    for (const one of briefs) {
      expect(one).toContain('You are the orchestrator.')
      expect(one).toContain('subagent_type')
      expect(one).toContain('summarize the result for the user in one paragraph')
    }
  })
})
