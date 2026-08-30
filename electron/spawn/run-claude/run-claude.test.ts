import { describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => ({ runs: [] as string[][] }))

vi.mock('../run-settled/run-settled', () => ({
  runSettled: (plan: { args: string[]; exit: (code: number, text: string) => unknown }) => {
    fake.runs.push(plan.args)
    return Promise.resolve(plan.exit(0, 'said'))
  },
  trackChild: () => undefined,
  untrackChild: () => undefined,
}))

vi.mock('../../cli/login-path/login-path', () => ({
  claudeBin: async () => '/usr/local/bin/claude',
  loginPath: async () => '/usr/local/bin',
}))

const { duringAccountWork } = await import('../account-work/account-work')
const { runClaude } = await import('./run-claude')

describe('a one-shot claude run, which the connectors and the plugins are made of', () => {
  it('runs when nothing is holding the account still', async () => {
    fake.runs.length = 0
    expect(await runClaude(['mcp', 'list'], 1000)).toEqual({ ok: true, value: 'said' })
    expect(fake.runs).toEqual([['mcp', 'list']])
  })

  it('spawns nothing while an account operation is in flight', async () => {
    fake.runs.length = 0
    const answered = await duringAccountWork(() => runClaude(['mcp', 'list'], 1000))

    expect(answered).toEqual({ ok: false, why: { code: 'busy', said: '' } })
    expect(fake.runs).toEqual([])
  })

  it('runs again once the operation has let go', async () => {
    fake.runs.length = 0
    await duringAccountWork(async () => undefined)
    await runClaude(['plugin', 'list'], 1000)

    expect(fake.runs).toEqual([['plugin', 'list']])
  })
})
