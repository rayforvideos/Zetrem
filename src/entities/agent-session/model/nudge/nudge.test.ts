import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { nudgeFor } from './nudge'
import type { NudgeAt } from './nudge.types'

function at(over: Partial<NudgeAt> = {}): NudgeAt {
  return { wanted: true, watching: false, reason: 'done', tool: '', ...over }
}

describe('nudgeFor: a word only when you are not already looking', () => {
  it('says nothing while the window is in front of you', () => {
    expect(nudgeFor(at({ watching: true })), '보고 있는데 울리면 소음이다').toBe(null)
  })

  it('says nothing when the setting is off', () => {
    expect(nudgeFor(at({ wanted: false }))).toBe(null)
  })

  it('stays quiet when it is off even with the window away', () => {
    expect(nudgeFor(at({ wanted: false, watching: false }))).toBe(null)
  })

  it('speaks once the work is done and you have gone elsewhere', () => {
    expect(nudgeFor(at())).toEqual({
      reason: 'done',
      title: 'Zetrem is done',
      body: 'Your team has finished.',
    })
  })

  it('names the tool that is waiting, so you know what you are being asked', () => {
    expect(nudgeFor(at({ reason: 'permission', tool: 'Bash' }))).toEqual({
      reason: 'permission',
      title: 'Zetrem needs you',
      body: 'Waiting to run Bash',
    })
  })

  it('still asks when the tool has no name', () => {
    expect(nudgeFor(at({ reason: 'permission' }))?.body).toBe('Waiting for your approval')
  })
})

describe('the notice speaks for the app, not for the conversation', () => {
  const ROMAN = /^[\x20-\x7E]*$/

  it('writes every word in the language the app is written in', () => {
    for (const said of [
      nudgeFor(at()),
      nudgeFor(at({ reason: 'permission', tool: 'Bash' })),
      nudgeFor(at({ reason: 'permission' })),
    ]) {
      expect(said?.title, said?.title).toMatch(ROMAN)
      expect(said?.body, said?.body).toMatch(ROMAN)
    }
  })

  it('carries no line of the answer, which can be written in any language', () => {
    const said = nudgeFor(at())
    expect(said?.body, '대화 내용은 알림이 옮길 것이 아니다').not.toContain('답')
  })

  it('says the same thing however long the work ran', () => {
    expect(nudgeFor(at())?.body).toBe(nudgeFor(at())?.body)
  })
})

describe('the notice speaks whichever language the app speaks', () => {
  afterEach(() => i18n.activate('en'))

  it('says the finished notice in Korean', () => {
    i18n.activate('ko')
    expect(nudgeFor(at())).toEqual({
      reason: 'done',
      title: '일이 끝났습니다',
      body: '팀이 일을 마쳤습니다.',
    })
  })

  it('puts the tool where Korean wants it, which is not where English does', () => {
    i18n.activate('ko')
    expect(nudgeFor(at({ reason: 'permission', tool: 'Bash' }))?.body).toBe('Bash 실행을 기다립니다')
  })

  it('stays English while the app is English', () => {
    expect(nudgeFor(at())?.title).toBe('Zetrem is done')
  })

  it('says the problem notice in Korean', () => {
    i18n.activate('ko')
    expect(nudgeFor(at({ trouble: true }))).toEqual({
      reason: 'done',
      title: 'Zetrem에 문제가 생겼습니다',
      body: '세션이 오류로 멈췄습니다.',
    })
  })
})

describe('a turn that stopped to ask is not a turn that finished', () => {
  const at = { wanted: true, watching: false, tool: '' }

  it('says nothing about being done while approval is pending', () => {
    expect(nudgeFor({ ...at, reason: 'done', asked: true })).toBeNull()
  })

  it('still says it is done when nothing is pending', () => {
    expect(nudgeFor({ ...at, reason: 'done', asked: false })?.reason).toBe('done')
  })

  it('still asks for approval, which is the notice worth acting on', () => {
    expect(nudgeFor({ ...at, reason: 'permission', tool: 'Bash', asked: true })?.reason).toBe(
      'permission',
    )
  })
})

describe('a turn that stopped on an error is not a turn that finished cleanly', () => {
  it('says a problem happened instead of claiming the team is done', () => {
    expect(nudgeFor(at({ trouble: true }))).toEqual({
      reason: 'done',
      title: 'Zetrem hit a problem',
      body: 'A session stopped with an error.',
    })
  })

  it('stays quiet about the error too when you are watching', () => {
    expect(nudgeFor(at({ trouble: true, watching: true }))).toBeNull()
  })

  it('says the ordinary done notice when nothing went wrong', () => {
    expect(nudgeFor(at({ trouble: false }))).toEqual({
      reason: 'done',
      title: 'Zetrem is done',
      body: 'Your team has finished.',
    })
  })
})
