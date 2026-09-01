import { describe, expect, it } from 'vitest'
import { branchesOf, graphOf, logOf, shownOf, statsOf, statusOf } from './git-desk'

describe('statusOf: porcelain v2 with --branch, one struct out', () => {
  const PORCELAIN = [
    '# branch.oid 20edd15aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '# branch.head 1.0.1-beta.4',
    '# branch.upstream origin/1.0.1-beta.4',
    '# branch.ab +2 -1',
    '1 .M N... 100644 100644 100644 aaaa bbbb src/app.ts',
    '1 M. N... 100644 100644 100644 aaaa bbbb src/host.ts',
    '1 MM N... 100644 100644 100644 aaaa bbbb src/both.ts',
    '2 R. N... 100644 100644 100644 aaaa bbbb R100 src/new.ts\tsrc/old.ts',
    '? notes.txt',
    '',
  ].join('\n')

  it('reads the branch, its upstream, and how far apart they are', () => {
    const status = statusOf(PORCELAIN)
    expect(status.branch).toBe('1.0.1-beta.4')
    expect(status.upstream).toBe('origin/1.0.1-beta.4')
    expect(status.ahead).toBe(2)
    expect(status.behind).toBe(1)
  })

  it('splits every entry into staged and unstaged sides', () => {
    const files = statusOf(PORCELAIN).files
    expect(files).toEqual([
      { path: 'src/app.ts', staged: false, unstaged: true, sign: 'M' },
      { path: 'src/host.ts', staged: true, unstaged: false, sign: 'M' },
      { path: 'src/both.ts', staged: true, unstaged: true, sign: 'M' },
      { path: 'src/new.ts', staged: true, unstaged: false, sign: 'R' },
      { path: 'notes.txt', staged: false, unstaged: true, sign: '?' },
    ])
  })

  it('reads a branch with no upstream as zero apart', () => {
    const bare = statusOf('# branch.oid abc\n# branch.head fresh\n')
    expect(bare).toEqual({ branch: 'fresh', upstream: null, ahead: 0, behind: 0, files: [] })
  })

  it('names a detached head as such', () => {
    expect(statusOf('# branch.head (detached)\n').branch).toBe('(detached)')
  })
})

describe('branchesOf: the branch list with the current one marked', () => {
  it('reads the star column apart from the name', () => {
    const listed = branchesOf('*\t1.0.1-beta.4\n \tmaster\n \tspike/colors\n')
    expect(listed).toEqual([
      { name: '1.0.1-beta.4', current: true },
      { name: 'master', current: false },
      { name: 'spike/colors', current: false },
    ])
  })

  it('answers empty for no output', () => {
    expect(branchesOf('')).toEqual([])
  })
})

describe('logOf: recent commits, one line each', () => {
  it('splits the hash from the subject at the tab', () => {
    const lines = logOf('20edd15\tfix: translation stops pondering\nb4c7b89\tfeat: tints\n')
    expect(lines).toEqual([
      { sha: '20edd15', subject: 'fix: translation stops pondering' },
      { sha: 'b4c7b89', subject: 'feat: tints' },
    ])
  })

  it('keeps a subject that itself holds a tab whole', () => {
    expect(logOf('abc1234\ta\tb\n')).toEqual([{ sha: 'abc1234', subject: 'a\tb' }])
  })
})

describe('graphOf: the log with parents and refs, one commit a line', () => {
  const LOG = [
    'aaaa\ta1\tbbbb cccc\tHEAD -> main, origin/main, tag: v1.0\tRay\t1756700000\tmerge the spike',
    'bbbb\tb1\tdddd\t\tRay\t1756600000\tfix: a thing',
    'cccc\tc1\tdddd\tspike/x\tKim\t1756500000\ttry: a spike',
    'dddd\td1\t\t\tRay\t1756400000\tfirst',
    '',
  ].join('\n')

  it('splits sha, short, parents, author, time and subject', () => {
    const commits = graphOf(LOG)
    expect(commits).toHaveLength(4)
    expect(commits[0]).toMatchObject({
      sha: 'aaaa',
      short: 'a1',
      parents: ['bbbb', 'cccc'],
      author: 'Ray',
      at: 1_756_700_000_000,
      subject: 'merge the spike',
    })
    expect(commits[3]).toMatchObject({ parents: [], refs: [], head: false })
  })

  it('reads the refs apart and marks where HEAD sits', () => {
    const commits = graphOf(LOG)
    expect(commits[0]?.head).toBe(true)
    expect(commits[0]?.refs).toEqual(['main', 'origin/main', 'v1.0'])
    expect(commits[2]?.refs).toEqual(['spike/x'])
  })

  it('keeps a subject holding a tab whole', () => {
    const one = graphOf('aaaa\ta1\t\t\tRay\t1756400000\ta\tb\n')
    expect(one[0]?.subject).toBe('a\tb')
  })
})

describe('shownOf: which files one commit touched', () => {
  it('reads the status letter and the path', () => {
    const files = shownOf('M\tsrc/app.ts\nA\tsrc/new.ts\nD\tgone.ts\n')
    expect(files).toEqual([
      { path: 'src/app.ts', sign: 'M' },
      { path: 'src/new.ts', sign: 'A' },
      { path: 'gone.ts', sign: 'D' },
    ])
  })

  it('names a rename by where the file went', () => {
    expect(shownOf('R100\told.ts\tnew.ts\n')).toEqual([{ path: 'new.ts', sign: 'R' }])
  })
})

describe('statsOf: how much each commit changed, keyed by sha', () => {
  it('reads files, insertions and deletions from --shortstat blocks', () => {
    const out = [
      'aaaa',
      ' 3 files changed, 40 insertions(+), 8 deletions(-)',
      'bbbb',
      ' 1 file changed, 2 deletions(-)',
      'cccc',
      '',
    ].join('\n')
    expect(statsOf(out)).toEqual({
      aaaa: { files: 3, adds: 40, dels: 8 },
      bbbb: { files: 1, adds: 0, dels: 2 },
      cccc: { files: 0, adds: 0, dels: 0 },
    })
  })
})
