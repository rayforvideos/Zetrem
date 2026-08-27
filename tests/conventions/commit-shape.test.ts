import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const TYPE = /^(feat|fix|refactor|test|chore|docs|perf|build|ci)(\([a-z0-9-]+\))?: \S/
const SUBJECT_MAX = 72
const THEIRS = /^Merge [0-9a-f]{40} into [0-9a-f]{40}$/

// On a pull request the runner checks out a merge commit GitHub wrote, "Merge
// <sha> into <sha>". The clone is shallow, so it has no parents and --no-merges
// cannot tell it is a merge; it is named by its subject instead.
function commits(): { sha: string; subject: string; body: string }[] | null {
  let out: string
  try {
    out = execFileSync('git', ['log', '--no-merges', '--format=%H%x00%s%x00%b%x1e'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
  } catch {
    return null
  }
  return out
    .split('\x1e')
    .map((one) => one.trim())
    .filter((one) => one.length > 0)
    .map((one) => {
      const [sha = '', subject = '', body = ''] = one.split('\x00')
      return { sha: sha.slice(0, 7), subject, body }
    })
    .filter((one) => !THEIRS.test(one.subject))
}

const history = commits()

describe.skipIf(history === null)('a commit says what kind it is', () => {
  const all = history ?? []

  it('has commits to look at', () => {
    expect(all.length).toBeGreaterThan(0)
  })

  it('passes over the merge commit a pull request run is checked out at', () => {
    const theirs = `Merge ${'a'.repeat(40)} into ${'b'.repeat(40)}`
    expect(THEIRS.test(theirs)).toBe(true)
    expect(THEIRS.test('Merge branch of somebody who wrote it by hand')).toBe(false)
  })

  it('names its type, so the log can be read at a glance', () => {
    const wrong = all
      .filter((one) => !TYPE.test(one.subject))
      .map((one) => `${one.sha} ${one.subject}`)
    expect(wrong, 'name the kind, as in feat:. See Commits in CONTRIBUTING.md').toEqual([])
  })

  it('keeps the subject short enough to read in a list', () => {
    const long = all
      .filter((one) => one.subject.length > SUBJECT_MAX)
      .map((one) => `${one.sha} (${one.subject.length} chars)`)
    expect(long, `keep the subject within ${SUBJECT_MAX} characters`).toEqual([])
  })
})
