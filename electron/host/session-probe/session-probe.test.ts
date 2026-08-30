import { describe, expect, it, vi } from 'vitest'
import type { RunConfig } from '@/entities/claude-cli/api/run-config/run-config.types'

const fake = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
  project: null as string | null,
  account: 0,
  runs: [] as { answer: (line: string | null) => void }[],
  here: null as string | null,
  kept: [] as string[],
}))

vi.mock('electron', () => ({ app: { getPath: () => '/data/Zetrem' } }))

vi.mock('../../ipc/ipc', () => ({
  handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
    fake.handlers.set(channel, listener)
  },
}))

vi.mock('../../spawn/run-settled/run-settled', () => ({
  runSettled: () =>
    new Promise<string | null>((resolve) => {
      fake.runs.push({ answer: resolve })
    }),
  trackChild: () => undefined,
  untrackChild: () => undefined,
}))

vi.mock('../../spawn/kill-tree/kill-tree', () => ({ killTreeSync: () => undefined }))
vi.mock('../../cli/login-path/login-path', () => ({
  claudeBin: async () => '/usr/local/bin/claude',
  loginPath: async () => '/usr/local/bin',
}))
vi.mock('../../store/project-memory/project-memory', () => ({
  recallProject: async () => fake.project,
}))
vi.mock('../../library/library', () => ({ librarySessionArgs: async () => [] }))
vi.mock('../../shell/workspace-dir/workspace-dir', () => ({
  workspaceDir: async (project: string | null) => project ?? '/data/Zetrem/agent-workspace',
}))
vi.mock('../../cli/accounts/register-accounts/register-accounts', () => ({
  accountHereNow: async () => fake.here,
}))
vi.mock('../../store/save-file/save-file', () => ({
  saveFile: async (_path: string, text: string) => {
    fake.kept.push(text)
  },
}))
vi.mock('../../store/kept-usage/kept-usage', () => ({
  keptUsagePath: () => '/data/Zetrem/usage.json',
}))
vi.mock('../../cli/accounts/account-change/account-change', () => ({
  accountChanges: () => fake.account,
}))

const { duringAccountWork } = await import('../../spawn/account-work/account-work')
const { registerSessionProbe } = await import('./session-probe')
registerSessionProbe()

const config: Omit<RunConfig, 'persona'> = {
  permissionMode: 'ask',
  model: 'default',
  effort: 'default',
  people: [],
  lock: null,
}

function probe(): Promise<string | null> {
  const listener = fake.handlers.get('session:probe')
  if (listener === undefined) throw new Error('nothing listens on session:probe')
  return listener({}, config) as Promise<string | null>
}

const INIT = '{"type":"system","subtype":"init","session_id":"s1"}'

async function untilRuns(count: number): Promise<void> {
  await vi.waitFor(() => expect(fake.runs).toHaveLength(count))
}

describe('session:probe: one run answers everyone who asked the same question', () => {
  it('spawns once for two callers asking about the same project and account', async () => {
    fake.runs.length = 0
    const first = probe()
    await untilRuns(1)
    const second = probe()
    await untilRuns(1)

    fake.runs[0]?.answer(INIT)

    expect(await first).toBe(INIT)
    expect(await second).toBe(INIT)
  })

  it('does not hand a probe begun before an account change to a caller after it', async () => {
    fake.runs.length = 0
    const before = probe()
    await untilRuns(1)

    fake.account += 1
    const after = probe()
    await untilRuns(2)

    fake.runs[0]?.answer('{"type":"system","subtype":"init","session_id":"was-account-a"}')
    fake.runs[1]?.answer('{"type":"system","subtype":"init","session_id":"is-account-b"}')

    expect(await before).toContain('was-account-a')
    expect(await after).toContain('is-account-b')
  })
})

function readUsage(): Promise<string | null> {
  const listener = fake.handlers.get('session:usage')
  if (listener === undefined) throw new Error('nothing listens on session:usage')
  return listener({}) as Promise<string | null>
}

describe('the account a kept reading is stamped with', () => {
  async function readOne(report: string): Promise<Record<string, unknown>> {
    fake.runs.length = 0
    fake.kept.length = 0
    const asking = readUsage()
    await untilRuns(1)
    fake.runs[0]?.answer(report)
    await asking
    return JSON.parse(fake.kept[0] ?? '{}') as Record<string, unknown>
  }

  it('is the one the credentials on this computer belong to', async () => {
    fake.here = 'ray@un7qi3.co'
    expect(await readOne('5-hour 20%')).toMatchObject({ who: 'ray@un7qi3.co' })
  })

  it('is nobody when no slot and no label can name what is here', async () => {
    fake.here = null
    expect(await readOne('5-hour 20%')).toMatchObject({ who: null })
  })
})

describe('the minute tick, which must not run a claude through an account change', () => {
  it('spawns no probe while an account operation is in flight, and learns nothing', async () => {
    fake.runs.length = 0
    const found = await duringAccountWork(() => probe())

    expect(found).toBeNull()
    expect(fake.runs).toEqual([])
  })

  it('reads no usage while an account operation is in flight', async () => {
    fake.runs.length = 0
    const said = await duringAccountWork(() => readUsage())

    expect(said).toBeNull()
    expect(fake.runs).toEqual([])
  })

  it('probes again once the operation has let go', async () => {
    fake.runs.length = 0
    fake.account += 1
    const asking = probe()
    await untilRuns(1)
    fake.runs[0]?.answer(INIT)

    expect(await asking).toBe(INIT)
  })
})
