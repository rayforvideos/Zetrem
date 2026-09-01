import { describe, expect, it } from 'vitest'
import type { GitReply } from '../worktree-review/worktree-review.types'
import {
  gitBranches,
  gitCommit,
  gitDiff,
  gitGraph,
  gitLog,
  gitPull,
  gitPush,
  gitShow,
  gitShowDiff,
  gitStage,
  gitStatus,
  gitSwitch,
  gitUnstage,
} from './git-desk'
import type { GitDeps } from './git-desk.types'

type Call = string[]

function fakeGit(replies: Record<string, Partial<GitReply>>, calls: Call[] = []): GitDeps {
  return {
    here: () => Promise.resolve('/work/proj'),
    git: (args) => {
      calls.push(args)
      const found = replies[args.join(' ')] ?? {}
      return Promise.resolve({ code: 0, stdout: '', stderr: '', ...found })
    },
    read: () => Promise.resolve('line one\nline two\n'),
  }
}

describe('gitStatus', () => {
  it('parses what git said into the struct', async () => {
    const deps = fakeGit({
      'status --porcelain=v2 --branch': { stdout: '# branch.head main\n? a.txt\n' },
    })
    const got = await gitStatus(deps)
    expect(got).toEqual({
      ok: true,
      value: {
        branch: 'main',
        upstream: null,
        ahead: 0,
        behind: 0,
        files: [{ path: 'a.txt', staged: false, unstaged: true, sign: '?' }],
      },
    })
  })

  it('says no-repo when git refuses the folder', async () => {
    const deps = fakeGit({
      'status --porcelain=v2 --branch': { code: 128, stderr: 'fatal: not a git repository' },
    })
    const got = await gitStatus(deps)
    expect(got.ok).toBe(false)
    expect(!got.ok && got.why.code).toBe('refused')
  })

  it('refuses with no project open', async () => {
    const deps = { ...fakeGit({}), here: () => Promise.resolve<string | null>(null) }
    expect((await gitStatus(deps)).ok).toBe(false)
  })
})

describe('gitDiff', () => {
  it('asks for the staged side when told so', async () => {
    const calls: Call[] = []
    const deps = fakeGit({ 'diff --cached -- a.ts': { stdout: '+x\n' } }, calls)
    const got = await gitDiff(deps, 'a.ts', 'staged')
    expect(got).toEqual({ ok: true, value: '+x\n' })
  })

  it('draws an untracked file as all additions itself', async () => {
    const got = await gitDiff(fakeGit({}), 'notes.txt', 'untracked')
    expect(got).toEqual({ ok: true, value: '+line one\n+line two\n' })
  })
})

describe('gitCommit', () => {
  it('will not commit an empty message', async () => {
    const calls: Call[] = []
    const got = await gitCommit(fakeGit({}, calls), '   ')
    expect(got.ok).toBe(false)
    expect(calls).toEqual([])
  })

  it('hands the message to git whole', async () => {
    const calls: Call[] = []
    await gitCommit(fakeGit({}, calls), 'fix: a thing')
    expect(calls).toEqual([['commit', '-m', 'fix: a thing']])
  })
})

describe('gitSwitch', () => {
  it('switches to a branch that exists', async () => {
    const calls: Call[] = []
    await gitSwitch(fakeGit({}, calls), 'master', false)
    expect(calls).toEqual([['switch', 'master']])
  })

  it('creates when asked', async () => {
    const calls: Call[] = []
    await gitSwitch(fakeGit({}, calls), 'spike/x', true)
    expect(calls).toEqual([['switch', '-c', 'spike/x']])
  })

  it('refuses a name git would choke on', async () => {
    const calls: Call[] = []
    const got = await gitSwitch(fakeGit({}, calls), '-delete', true)
    expect(got.ok).toBe(false)
    expect(calls).toEqual([])
  })
})

describe('gitPush and gitPull', () => {
  it('pushes plainly with an upstream set', async () => {
    const calls: Call[] = []
    const deps = fakeGit(
      {
        'status --porcelain=v2 --branch': {
          stdout: '# branch.head main\n# branch.upstream origin/main\n',
        },
      },
      calls,
    )
    await gitPush(deps)
    expect(calls.at(-1)).toEqual(['push'])
  })

  it('sets the upstream on a branch that has none', async () => {
    const calls: Call[] = []
    const deps = fakeGit(
      { 'status --porcelain=v2 --branch': { stdout: '# branch.head spike/x\n' } },
      calls,
    )
    await gitPush(deps)
    expect(calls.at(-1)).toEqual(['push', '-u', 'origin', 'spike/x'])
  })

  it('pulls fast-forward only, so nothing merges by surprise', async () => {
    const calls: Call[] = []
    await gitPull(fakeGit({}, calls))
    expect(calls).toEqual([['pull', '--ff-only']])
  })
})

describe('gitStage and gitUnstage', () => {
  it('quotes the path behind -- on both sides', async () => {
    const calls: Call[] = []
    const deps = fakeGit({}, calls)
    await gitStage(deps, 'src/a.ts')
    await gitUnstage(deps, 'src/a.ts')
    expect(calls).toEqual([
      ['add', '--', 'src/a.ts'],
      ['restore', '--staged', '--', 'src/a.ts'],
    ])
  })

  it('refuses a path that reads as a flag or leaves the repo', async () => {
    const calls: Call[] = []
    const deps = fakeGit({}, calls)
    expect((await gitStage(deps, '--all')).ok).toBe(false)
    expect((await gitStage(deps, '../outside.ts')).ok).toBe(false)
    expect((await gitUnstage(deps, '/etc/passwd')).ok).toBe(false)
    expect(calls).toEqual([])
  })
})

describe('gitBranches and gitLog', () => {
  it('hand what git listed through the parsers', async () => {
    const deps = fakeGit({
      'branch --format=%(HEAD)%09%(refname:short)': { stdout: '*\tmain\n \tspike\n' },
      'log --format=%h%x09%s -n 20': { stdout: 'abc1234\tfirst\n' },
    })
    expect(await gitBranches(deps)).toEqual({
      ok: true,
      value: [
        { name: 'main', current: true },
        { name: 'spike', current: false },
      ],
    })
    expect(await gitLog(deps)).toEqual({ ok: true, value: [{ sha: 'abc1234', subject: 'first' }] })
  })

  it('reads an empty log as no commits yet, not a failure', async () => {
    const deps = fakeGit({ 'log --format=%h%x09%s -n 20': { code: 128, stderr: 'no commits' } })
    expect(await gitLog(deps)).toEqual({ ok: true, value: [] })
  })
})

describe('gitGraph, gitShow and gitShowDiff', () => {
  it('reads the whole-graph log through the parser', async () => {
    const deps = fakeGit({
      'log --all --topo-order -n 300 --format=%H%x09%h%x09%P%x09%D%x09%an%x09%at%x09%s': {
        stdout: 'aaaa\ta1\t\tHEAD -> main\tRay\t1756400000\tfirst\n',
      },
    })
    const got = await gitGraph(deps)
    expect(got.ok && got.value[0]).toMatchObject({ sha: 'aaaa', head: true, refs: ['main'] })
  })

  it('reads an unborn repo as an empty graph', async () => {
    const deps = fakeGit({
      'log --all --topo-order -n 300 --format=%H%x09%h%x09%P%x09%D%x09%an%x09%at%x09%s': {
        code: 128,
        stderr: 'no commits yet',
      },
    })
    expect(await gitGraph(deps)).toEqual({ ok: true, value: [] })
  })

  it('lists what one commit touched, refusing a sha that is not one', async () => {
    const deps = fakeGit({
      'show --format= --name-status abc1234': { stdout: 'M\tsrc/app.ts\n' },
    })
    expect(await gitShow(deps, 'abc1234')).toEqual({
      ok: true,
      value: [{ path: 'src/app.ts', sign: 'M' }],
    })
    expect((await gitShow(deps, 'HEAD;rm')).ok).toBe(false)
  })

  it('shows one file of one commit, path behind --', async () => {
    const calls: Call[] = []
    const deps = fakeGit({ 'show --format= abc1234 -- src/app.ts': { stdout: '+x\n' } }, calls)
    expect(await gitShowDiff(deps, 'abc1234', 'src/app.ts')).toEqual({ ok: true, value: '+x\n' })
    expect((await gitShowDiff(deps, 'abc1234', '--all')).ok).toBe(false)
  })
})
