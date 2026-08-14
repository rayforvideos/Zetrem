import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { agentArgs } from '../run-config/run-config'
import { ORCHESTRATOR, agentsArgs } from '../roster-lock/roster-lock'
import { ORCHESTRATOR_PROMPT } from './orchestrator'

const person = { name: 'Explore', description: '', prompt: '찾아본다', model: null }

describe('오케스트레이터 프롬프트', () => {
  it('사람이 쓰는 언어로 답하라고 이른다 — 한국어로 물었는데 영어로 답하면 안 된다', () => {
    expect(ORCHESTRATOR_PROMPT).toContain('language the person writes')
  })

  it('빈 프롬프트로 잠그지 않는다 — 시킬 말이 없으면 시키는 대로 굴지 않는다', () => {
    const args = agentsArgs([person], { knownTools: ['Read'], alsoCallable: [] }, ORCHESTRATOR_PROMPT)
    const spec = JSON.parse(args[args.indexOf('--agents') + 1]!)
    expect(spec[ORCHESTRATOR].prompt).toBe(ORCHESTRATOR_PROMPT)
    expect(spec[ORCHESTRATOR].prompt.length).toBeGreaterThan(0)
  })

  it('메인 프로세스가 실제로 넘기는 말이 이 말이다 — 같은 프롬프트를 두 벌 두지 않는다', async () => {
    const host = await readFile('electron/agent-host.ts', 'utf8')
    expect(host).toContain('ORCHESTRATOR_PROMPT')
    expect(host).not.toContain('agent-style')
  })

  it('잠겨 있지 않아도 같은 말을 붙인다 — 명단을 잠갔는지에 따라 말투가 달라지면 안 된다', () => {
    const args = agentArgs({
      permissionMode: 'ask',
      model: 'default',
      persona: ORCHESTRATOR_PROMPT,
      people: [person],
      lock: null,
    })
    expect(args[args.indexOf('--append-system-prompt') + 1]).toBe(ORCHESTRATOR_PROMPT)
  })

  it('붙일 말이 없으면 빈 깃발을 넘기지 않는다', () => {
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
