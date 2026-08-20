import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { agentArgs } from '../run-config/run-config'
import { ORCHESTRATOR, agentsArgs } from '../roster-lock/roster-lock'
import { ORCHESTRATOR_PROMPT, PERSONA } from './orchestrator'

const person = { name: 'Explore', description: '', prompt: '찾아본다', model: null, tools: [] }

describe('what the orchestrator is told', () => {
  it('says nothing about which language to answer in, which the CLI decides', () => {
    expect(ORCHESTRATOR_PROMPT.toLowerCase()).not.toContain('language')
  })

  it('never locks with an empty brief, since nothing told is nothing followed', () => {
    const args = agentsArgs([person], { blockedAgents: [] }, ORCHESTRATOR_PROMPT)
    const spec = JSON.parse(args[args.indexOf('--agents') + 1]!)
    expect(spec[ORCHESTRATOR].prompt).toBe(ORCHESTRATOR_PROMPT)
    expect(spec[ORCHESTRATOR].prompt.length).toBeGreaterThan(0)
  })

  it('is the brief the main process actually passes, so there are not two copies', async () => {
    const host = await readFile('electron/agent-host/agent-host.ts', 'utf8')
    expect(host).toContain('ORCHESTRATOR_PROMPT')
    expect(host).not.toContain('agent-style')
  })

  it('adds the same brief unlocked, so locking does not change how it speaks', () => {
    const args = agentArgs({
      permissionMode: 'ask',
      model: 'default',
      persona: ORCHESTRATOR_PROMPT,
      people: [person],
      lock: null,
    })
    expect(args[args.indexOf('--append-system-prompt') + 1]).toBe(ORCHESTRATOR_PROMPT)
  })

  it('passes no empty flag when there is nothing to add', () => {
    const args = agentArgs({
      permissionMode: 'ask',
      model: 'default',
      persona: '',
      people: [],
      lock: null,
    })
    expect(args).not.toContain('--append-system-prompt')
  })
})

describe('the app does not shape the answer itself', () => {
  const said = `${PERSONA} ${ORCHESTRATOR_PROMPT}`.toLowerCase()

  it('never asks for a line narrating what it is about to do', () => {
    for (const phrase of ['open every reply', 'one sentence saying what you are doing']) {
      expect(said, 'Zetrem 이 답변 앞에 문장을 덧붙이게 하면 CLI 와 답이 달라진다').not.toContain(phrase)
    }
  })

  it('never renames the assistant, since the answer should read as Claude Code', () => {
    expect(said).not.toContain('you are zeta')
  })

  it('adds nothing at all outside the orchestrator, so a plain session is untouched', () => {
    expect(PERSONA).toBe('')
  })

  it('still says how to hand work to a teammate, which is the app working, not the answer', () => {
    expect(ORCHESTRATOR_PROMPT).toContain('subagent_type')
  })
})
