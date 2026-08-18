import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const TYPE = /^(feat|fix|refactor|test|chore|docs|perf|build|ci)(\([a-z0-9-]+\))?: \S/
const KOREAN_MARK = '—— 한국어 ——'
const HANGUL = /[가-힣]/
const SUBJECT_MAX = 72

// CONTRIBUTING says what a commit looks like, and until now nothing checked it.
// A convention no test holds is one that drifts the moment somebody is in a hurry.
function commits(): { sha: string; subject: string; body: string }[] {
  const out = execFileSync('git', ['log', '--format=%H%x00%s%x00%b%x1e'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  return out
    .split('\x1e')
    .map((one) => one.trim())
    .filter((one) => one.length > 0)
    .map((one) => {
      const [sha = '', subject = '', body = ''] = one.split('\x00')
      return { sha: sha.slice(0, 7), subject, body }
    })
}

describe('a commit says what kind it is, in both languages', () => {
  const all = commits()

  it('has commits to look at', () => {
    expect(all.length).toBeGreaterThan(0)
  })

  it('names its type, so the log can be read at a glance', () => {
    const wrong = all.filter((one) => !TYPE.test(one.subject)).map((one) => `${one.sha} ${one.subject}`)
    expect(wrong, 'feat: 처럼 종류를 붙인다. CONTRIBUTING.md 의 Commits 를 보라').toEqual([])
  })

  it('keeps the subject short enough to read in a list', () => {
    const long = all
      .filter((one) => one.subject.length > SUBJECT_MAX)
      .map((one) => `${one.sha} (${one.subject.length}자)`)
    expect(long, `제목은 ${SUBJECT_MAX}자 이내`).toEqual([])
  })

  it('says it in Korean too, under the mark', () => {
    const missing = all
      .filter((one) => !one.body.includes(KOREAN_MARK) || !HANGUL.test(one.body.split(KOREAN_MARK)[1] ?? ''))
      .map((one) => `${one.sha} ${one.subject}`)
    expect(missing, `본문은 영어 다음에 ${KOREAN_MARK} 을 두고 한국어를 적는다`).toEqual([])
  })
})
