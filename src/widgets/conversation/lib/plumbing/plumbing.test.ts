import { describe, expect, it } from 'vitest'
import { spawnResult, withoutPlumbing } from './plumbing'

const SPAWN = `Async agent launched successfully. (This tool result is internal metadata — never quote or paste any part of it, including the agentId below, into a user-facing reply.)
agentId: a1b2c3 (internal ID - do not mention to user. Use SendMessage with to: 'a1b2c3', summary: '<5-10 word recap>' to continue this agent.)
The agent is working in the background. You will be notified automatically when it completes.
output_file: /tmp/tasks/a1b2c3.output
Do NOT Read or tail this file via the shell tool — it is the full subagent JSONL transcript.`

describe('what the CLI writes for the model is not what the tool did', () => {
  it('leaves nothing of a spawn but the one line that says it happened', () => {
    expect(withoutPlumbing(SPAWN)).toBe('Async agent launched successfully.')
  })

  it('keeps the actual result of a finished agent', () => {
    const said = `The command completed successfully. Here is the output:

hi
agentId: aed12f (use SendMessage with to: 'aed12f' to continue this agent)
<usage>subagent_tokens: 16208
tool_uses: 1</usage>`
    expect(withoutPlumbing(said)).toBe(
      'The command completed successfully. Here is the output:\n\nhi',
    )
  })

  it('leaves an ordinary tool result alone', () => {
    const said = 'total 12\ndrwxr-xr-x  4 me  staff  128 Aug 22 01:00 .'
    expect(withoutPlumbing(said)).toBe(said)
  })

  it('does not collapse a blank line that is inside the output', () => {
    expect(withoutPlumbing('one\n\ntwo')).toBe('one\n\ntwo')
  })

  it('comes back empty when the result was plumbing all the way down', () => {
    expect(withoutPlumbing('agentId: x\noutput_file: /tmp/x')).toBe('')
  })
  it('is only for a spawn, so a build log keeping the word output_file survives', () => {
    expect(spawnResult('Agent Docs reviewer')).toBe(true)
    expect(spawnResult('Task something')).toBe(true)
    expect(spawnResult('Bash npm run build')).toBe(false)
  })
})
