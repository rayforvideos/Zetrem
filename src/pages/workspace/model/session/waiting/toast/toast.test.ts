import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { toastNoteOf, toastTitleOf } from './toast'
import type { Wait } from '../waiting.types'

function wait(over: Partial<Wait> = {}): Wait {
  return {
    chatId: 'chat-1',
    kind: 'permission',
    said: 'Write',
    target: 'src/mul.js',
    title: 'Shop',
    mark: 'req-1',
    onScreen: false,
    ...over,
  }
}

describe('toastTitleOf: the toast says what is being waited for', () => {
  it('names the permission and the file it would touch', () => {
    expect(toastTitleOf(wait(), false)).toBe('Waiting for your permission · src/mul.js')
  })

  it('names a file by its end, since the runtime hands over the whole path', () => {
    expect(
      toastTitleOf(wait({ target: '/private/tmp/shop/src/mul.js' }), false),
      '경로 앞머리는 토스트에서 이유를 밀어낸다',
    ).toBe('Waiting for your permission · src/mul.js')
  })

  it('reads a command from its front, which is where a command reads from', () => {
    expect(toastTitleOf(wait({ said: 'Bash', target: 'rm -rf build/out' }), false)).toBe(
      'Waiting for your permission · rm -rf build/out',
    )
  })

  it('keeps a web address whole enough to name the site', () => {
    expect(toastTitleOf(wait({ said: 'WebFetch', target: 'https://example.com/a/b' }), false)).toBe(
      'Waiting for your permission · https://example.com/a/b',
    )
  })

  it('falls back to the tool when the ask names nothing to touch', () => {
    expect(toastTitleOf(wait({ target: '', said: 'ExitPlanMode' }), false)).toBe(
      'Waiting for your permission · ExitPlanMode',
    )
  })

  it('quotes the question when the run stopped on one', () => {
    expect(
      toastTitleOf(wait({ kind: 'question', said: 'Rename or copy?', target: '' }), false),
    ).toBe('Waiting for your answer · Rename or copy?')
  })

  it('spells the reminder as the same wait carrying on', () => {
    expect(toastTitleOf(wait(), true)).toBe('Still waiting for your permission · src/mul.js')
    expect(toastTitleOf(wait({ kind: 'question', said: 'Which?', target: '' }), true)).toBe(
      'Still waiting for your answer · Which?',
    )
  })

  it('cuts a question long enough to bury the reason it opens with', () => {
    const said = `${'x'.repeat(200)}?`
    const title = toastTitleOf(wait({ kind: 'question', said, target: '' }), false)
    expect(title.length).toBeLessThan(90)
    expect(title.endsWith('…')).toBe(true)
  })

  it('reads as one line when there is nothing to name', () => {
    expect(toastTitleOf(wait({ kind: 'question', said: '', target: '' }), false)).toBe(
      'Waiting for your answer',
    )
  })

  it('takes a question over several lines as the one line it is', () => {
    expect(
      toastTitleOf(wait({ kind: 'question', said: 'Rename\n  or copy?', target: '' }), false),
    ).toBe('Waiting for your answer · Rename or copy?')
  })
})

describe('the reason is read in whichever language the app speaks', () => {
  afterEach(() => i18n.activate('en'))

  it('says what is waited for in Korean, with the file left as it is', () => {
    i18n.activate('ko')
    expect(toastTitleOf(wait(), false)).toBe('허가를 기다리는 중 · src/mul.js')
  })

  it('says the reminder in Korean too', () => {
    i18n.activate('ko')
    expect(toastTitleOf(wait({ kind: 'question', said: '어느 쪽?', target: '' }), true)).toBe(
      '아직 답을 기다리는 중 · 어느 쪽?',
    )
  })
})

describe('toastNoteOf: the chat under the reason, when it has a name', () => {
  it('names the chat the wait belongs to', () => {
    expect(toastNoteOf(wait())).toBe('Shop')
  })

  it('says nothing for a chat with no title yet', () => {
    expect(toastNoteOf(wait({ title: '' }))).toBeUndefined()
  })

  it('cuts a chat named after a whole paragraph', () => {
    const note = toastNoteOf(wait({ title: 'x'.repeat(200) })) ?? ''
    expect(note.length).toBeLessThanOrEqual(60)
    expect(note.endsWith('…')).toBe(true)
  })
})
