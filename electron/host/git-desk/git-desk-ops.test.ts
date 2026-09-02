import { describe, expect, it } from 'vitest'
import type { GitReply } from '../../shell/git-run/git-run.types'
import {
  gitBranches,
  gitCommit,
  gitDiff,
  gitGraph,
  gitImage,
  gitLog,
  gitMerge,
  gitMergeAbort,
  gitStashApply,
  gitStashDrop,
  gitStashList,
  gitStashPush,
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
    blob: () => Promise.resolve(Buffer.from('PNGDATA')),
  }
}

describe('gitStatus', () => {
  it('parses what git said into the struct', async () => {
    const deps = fakeGit({
      'status --porcelain=v2 --branch --untracked-files=all': {
        stdout: '# branch.head main\n? a.txt\n',
      },
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
      'status --porcelain=v2 --branch --untracked-files=all': {
        code: 128,
        stderr: 'fatal: not a git repository',
      },
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
        'status --porcelain=v2 --branch --untracked-files=all': {
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
      {
        'status --porcelain=v2 --branch --untracked-files=all': {
          stdout: '# branch.head spike/x\n',
        },
      },
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
      'log --branches --remotes --tags --topo-order -n 300 --format=%H%x09%h%x09%P%x09%D%x09%an%x09%ae%x09%at%x09%s':
        {
          stdout: 'aaaa\ta1\t\tHEAD -> main\tRay\tray@x.co\t1756400000\tfirst\n',
        },
    })
    const got = await gitGraph(deps)
    expect(got.ok && got.value[0]).toMatchObject({ sha: 'aaaa', head: true, refs: ['main'] })
  })

  it('reads an unborn repo as an empty graph', async () => {
    const deps = fakeGit({
      'log --branches --remotes --tags --topo-order -n 300 --format=%H%x09%h%x09%P%x09%D%x09%an%x09%ae%x09%at%x09%s':
        {
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

describe('gitDiff: the edges of what a diff can be', () => {
  it('says binary for an untracked file that is not text', async () => {
    const deps = { ...fakeGit({}), read: () => Promise.resolve('PNG\u0000\u0000binary') }
    const got = await gitDiff(deps, 'logo.png', 'untracked')
    expect(got).toEqual({ ok: false, why: { code: 'unsupported', said: 'binary' } })
  })

  it('says large for an untracked file too big to draw', async () => {
    const deps = { ...fakeGit({}), read: () => Promise.resolve('x'.repeat(1_000_001)) }
    const got = await gitDiff(deps, 'big.txt', 'untracked')
    expect(got).toEqual({ ok: false, why: { code: 'unsupported', said: 'large' } })
  })

  it('falls back to the tracked sides when an untracked hint cannot be read', async () => {
    const deps = {
      ...fakeGit({ 'diff -- was-untracked.ts': { stdout: '+now tracked\n' } }),
      read: () => Promise.resolve<string | null>(null),
    }
    const got = await gitDiff(deps, 'was-untracked.ts', 'untracked')
    expect(got).toEqual({ ok: true, value: '+now tracked\n' })
  })

  it('tries the other side when the hinted side has nothing', async () => {
    const deps = {
      ...fakeGit({ 'diff --cached -- staged.ts': { stdout: '+already staged\n' } }),
      read: () => Promise.resolve<string | null>(null),
    }
    const got = await gitDiff(deps, 'staged.ts', 'unstaged')
    expect(got).toEqual({ ok: true, value: '+already staged\n' })
  })

  it('draws a file the status has not caught up with from the disk', async () => {
    const deps = fakeGit({ 'ls-files --error-unmatch -- fresh.txt': { code: 1 } })
    const got = await gitDiff(deps, 'fresh.txt', 'unstaged')
    expect(got).toEqual({ ok: true, value: '+line one\n+line two\n' })
  })

  it('answers empty when no side differs and the disk cannot be read', async () => {
    const deps = { ...fakeGit({}), read: () => Promise.resolve<string | null>(null) }
    const got = await gitDiff(deps, 'same.ts', 'unstaged')
    expect(got).toEqual({ ok: true, value: '' })
  })

  it('says large for a tracked diff too big to draw', async () => {
    const deps = fakeGit({ 'diff -- huge.ts': { stdout: `+${'x'.repeat(1_000_001)}` } })
    const got = await gitDiff(deps, 'huge.ts', 'unstaged')
    expect(got).toEqual({ ok: false, why: { code: 'unsupported', said: 'large' } })
  })
})

describe('gitStatus: untracked files come one by one, never as a folder', () => {
  it('asks git to expand untracked folders into files', async () => {
    const calls: Call[] = []
    await gitStatus(fakeGit({}, calls))
    expect(calls).toEqual([['status', '--porcelain=v2', '--branch', '--untracked-files=all']])
  })
})

describe('what a failed act says', () => {
  it('hands back what git printed, from stdout when stderr is silent', async () => {
    const deps = fakeGit({
      'commit -m test': {
        code: 1,
        stdout: 'nothing added to commit but untracked files present\n',
        stderr: '',
      },
    })
    const got = await gitCommit(deps, 'test')
    expect(!got.ok && got.why.said).toContain('nothing added to commit')
  })

  it('sees through the runner substituting its own line for a silent stderr', async () => {
    const deps = fakeGit({
      'commit -m test': {
        code: 1,
        stdout: 'nothing added to commit but untracked files present\n',
        stderr: 'Command failed: git -c core.quotepath=false commit -m test',
      },
    })
    const got = await gitCommit(deps, 'test')
    expect(!got.ok && got.why.said).toContain('nothing added to commit')
  })
})

describe('gitMerge', () => {
  it('merges the named branch without opening an editor', async () => {
    const calls: Call[] = []
    await gitMerge(fakeGit({}, calls), 'spike/x')
    expect(calls).toEqual([['merge', '--no-edit', 'spike/x']])
  })

  it('refuses a name git would read as a flag', async () => {
    const calls: Call[] = []
    expect((await gitMerge(fakeGit({}, calls), '-abort')).ok).toBe(false)
    expect(calls).toEqual([])
  })

  it('backs out of a conflicted merge on request', async () => {
    const calls: Call[] = []
    await gitMergeAbort(fakeGit({}, calls))
    expect(calls).toEqual([['merge', '--abort']])
  })
})

describe('the stash, kept apart from history', () => {
  it('lists entries as ref and subject', async () => {
    const deps = fakeGit({
      'stash list --format=%gd%x09%s': {
        stdout: 'stash@{0}\tWIP on main: 1234 things\nstash@{1}\tkept aside\n',
      },
    })
    expect(await gitStashList(deps)).toEqual({
      ok: true,
      value: [
        { ref: 'stash@{0}', subject: 'WIP on main: 1234 things' },
        { ref: 'stash@{1}', subject: 'kept aside' },
      ],
    })
  })

  it('pushes the working tree away, untracked files included', async () => {
    const calls: Call[] = []
    await gitStashPush(fakeGit({}, calls))
    expect(calls).toEqual([['stash', 'push', '--include-untracked']])
  })

  it('applies and drops one entry by its ref, refusing anything else', async () => {
    const calls: Call[] = []
    const deps = fakeGit({}, calls)
    await gitStashApply(deps, 'stash@{1}')
    await gitStashDrop(deps, 'stash@{0}')
    expect(calls).toEqual([
      ['stash', 'apply', 'stash@{1}'],
      ['stash', 'drop', 'stash@{0}'],
    ])
    expect((await gitStashApply(deps, 'HEAD~1')).ok).toBe(false)
    expect((await gitStashDrop(deps, '--all')).ok).toBe(false)
  })
})

describe('gitImage: a picture instead of a byte diff', () => {
  it('reads the working copy as a data URI with its mime', async () => {
    const got = await gitImage(fakeGit({}), 'logo.png', '')
    expect(got).toEqual({
      ok: true,
      value: `data:image/png;base64,${Buffer.from('PNGDATA').toString('base64')}`,
    })
  })

  it('reads a committed version through git, naming the blob', async () => {
    const deps = fakeGit({})
    const got = await gitImage(deps, 'art/logo.svg', 'abc1234')
    expect(got.ok && got.value.startsWith('data:image/svg+xml;base64,')).toBe(true)
  })

  it('refuses a ref that is not a sha, HEAD, or a first parent of one', async () => {
    expect((await gitImage(fakeGit({}), 'a.png', 'main;rm')).ok).toBe(false)
    expect((await gitImage(fakeGit({}), 'a.png', 'HEAD')).ok).toBe(true)
    expect((await gitImage(fakeGit({}), 'a.png', 'abc1234^')).ok).toBe(true)
  })

  it('says gone when there is nothing to read', async () => {
    const deps = { ...fakeGit({}), blob: () => Promise.resolve<Buffer | null>(null) }
    expect((await gitImage(deps, 'a.png', '')).ok).toBe(false)
  })
})
