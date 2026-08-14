import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { agentArgs } from '../run-config/run-config'
import { ORCHESTRATOR, agentsArgs } from '../roster-lock/roster-lock'
import { ORCHESTRATOR_PROMPT } from './orchestrator'

const person = { name: 'Explore', description: '', prompt: '찾아본다', model: null }

describe('what the orchestrator is told', () => {
  it('tells it to answer in the language it was asked in', () => {
    expect(ORCHESTRATOR_PROMPT).toContain('language the person writes')
  })

  it('never locks with an empty brief, since nothing told is nothing followed', () => {
    const args = agentsArgs([person], { knownTools: ['Read'], alsoCallable: [] }, ORCHESTRATOR_PROMPT)
    const spec = JSON.parse(args[args.indexOf('--agents') + 1]!)
    expect(spec[ORCHESTRATOR].prompt).toBe(ORCHESTRATOR_PROMPT)
    expect(spec[ORCHESTRATOR].prompt.length).toBeGreaterThan(0)
  })

  it('is the brief the main process actually passes, so there are not two copies', async () => {
    const host = await readFile('electron/agent-host.ts', 'utf8')
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
