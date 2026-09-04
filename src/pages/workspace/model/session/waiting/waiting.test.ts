import { describe, expect, it } from 'vitest'
import type { Turn } from '@/entities/conversation'
import { REMIND_AFTER_MS, tellings, waitingOn, waitsOf, whereToTell } from './waiting'
import type { Ledger, Settled, Wait } from './waiting.types'

function turn(over: Partial<Turn> & { role: Turn['role'] }): Turn {
  return {
    id: `turn-${Math.random()}`,
    text: '',
    tools: [],
    draft: '',
    thinking: '',
    startedAtMs: 0,
    ...over,
  }
}

function said(text: string): Turn {
  return turn({ role: 'assistant', text })
}

function conv(over: Partial<Settled> = {}): Settled {
  return { turns: [], status: 'waiting', permission: null, ...over }
}

const ASK = { requestId: 'req-1', toolName: 'Bash', line: 'Bash ls', detail: '' }

describe('waitingOn: whether the run has stopped for the person', () => {
  it('says nothing while the turn is still being written', () => {
    expect(waitingOn(conv({ status: 'working', turns: [said('어느 쪽으로 할까요?')] }), true)).toBe(
      null,
    )
  })

  it('names the tool a permission ask is held on', () => {
    expect(waitingOn(conv({ permission: ASK }), false)).toEqual({
      kind: 'permission',
      said: 'Bash',
    })
  })

  it('holds a permission ask even while a teammate is still going', () => {
    expect(waitingOn(conv({ permission: ASK }), true)?.kind).toBe('permission')
  })

  it('reads a turn that ends in a question as a question', () => {
    expect(
      waitingOn(conv({ turns: [said('두 가지 안이 있습니다. 어느 쪽으로 할까요?')] }), false),
    ).toEqual({
      kind: 'question',
      said: '어느 쪽으로 할까요?',
    })
  })

  it('is nothing while a teammate is still at work, so a hand-back is not a question', () => {
    expect(waitingOn(conv({ turns: [said('Which one?')] }), true)).toBe(null)
  })

  it('is nothing once the session is over, so an old transcript stays quiet', () => {
    expect(waitingOn(conv({ status: 'done', turns: [said('Which one?')] }), false)).toBe(null)
  })

  it('is nothing when the turn simply reported back', () => {
    expect(waitingOn(conv({ turns: [said('All three files are renamed.')] }), false)).toBe(null)
  })

  it('is nothing once the person has already replied under it', () => {
    expect(
      waitingOn(
        conv({ turns: [said('Which one?'), turn({ role: 'user', text: 'the first' })] }),
        false,
      ),
    ).toBe(null)
  })

  it('looks past the notices the app itself lands on top of the turn', () => {
    expect(
      waitingOn(
        conv({ turns: [said('Which one?'), turn({ role: 'system', text: 'API error 529' })] }),
        false,
      )?.kind,
    ).toBe('question')
  })

  it('reads the runtime question tool whatever the prose around it says', () => {
    const asked = turn({
      role: 'assistant',
      text: 'Here are the two.',
      tools: [
        {
          line: 'AskUserQuestion',
          toolUseId: 'toolu_1',
          input: { questions: [{ question: 'Rename or copy?', header: 'How' }] },
          result: null,
          startedAtMs: 0,
          endedAtMs: null,
        },
      ],
    })
    expect(waitingOn(conv({ turns: [asked] }), false)).toEqual({
      kind: 'question',
      said: 'Rename or copy?',
    })
  })

  it('falls back to the turn when the question tool carries nothing readable', () => {
    const asked = turn({
      role: 'assistant',
      text: 'Pick one of these.\nMore below.',
      tools: [
        {
          line: 'AskUserQuestion',
          toolUseId: 'toolu_1',
          input: null,
          result: null,
          startedAtMs: 0,
          endedAtMs: null,
        },
      ],
    })
    expect(waitingOn(conv({ turns: [asked] }), false)?.said).toBe('Pick one of these.')
  })

  it('does not take a question inside a code block for one put to the person', () => {
    const text = 'Here is the check:\n\n```js\nif (ok) return "why?"\n```'
    expect(waitingOn(conv({ turns: [said(text)] }), false)).toBe(null)
  })

  it('reads only the close of a long message, not a question buried in it', () => {
    const text = `Is this the one? ${'x'.repeat(400)}. Done.`
    expect(waitingOn(conv({ turns: [said(text)] }), false)).toBe(null)
  })

  it('keeps the excerpt to the last sentence, not the whole report', () => {
    const text = 'I renamed three files and left the fourth alone.\nShall I do the fourth too?'
    expect(waitingOn(conv({ turns: [said(text)] }), false)?.said).toBe('Shall I do the fourth too?')
  })
})

describe('whereToTell: telling the person where they actually are', () => {
  it('sends a system notice when the window is not in front of them', () => {
    expect(whereToTell({ watching: false, chatOnScreen: true })).toBe('system')
  })

  it('raises a toast when they are in the app but somewhere else', () => {
    expect(whereToTell({ watching: true, chatOnScreen: false })).toBe('toast')
  })

  it('says nothing when the ask is already on their screen', () => {
    expect(whereToTell({ watching: true, chatOnScreen: true })).toBe('nothing')
  })
})

function wait(over: Partial<Wait> = {}): Wait {
  return {
    chatId: 'chat-1',
    kind: 'permission',
    said: 'Bash',
    title: 'Shop',
    mark: 'req-1',
    onScreen: false,
    steady: true,
    ...over,
  }
}

const AWAY = { watching: false, nowMs: 1_000 }

describe('tellings: one word, one reminder, and no more', () => {
  it('speaks the first time a wait is seen', () => {
    const out = tellings([wait()], {}, AWAY)
    expect(out.say).toEqual([{ wait: wait(), where: 'system', again: false }])
    expect(out.ledger['chat-1']).toEqual({ mark: 'req-1', toldAtMs: 1_000, times: 1 })
  })

  it('stays quiet on the pass right after', () => {
    const first = tellings([wait()], {}, AWAY)
    expect(tellings([wait()], first.ledger, { ...AWAY, nowMs: 2_000 }).say).toEqual([])
  })

  it('reminds once the wait has stood two minutes', () => {
    const first = tellings([wait()], {}, AWAY)
    const later = tellings([wait()], first.ledger, { ...AWAY, nowMs: 1_000 + REMIND_AFTER_MS })
    expect(later.say[0]?.again).toBe(true)
    expect(later.ledger['chat-1']?.times).toBe(2)
  })

  it('says nothing more after the reminder, however long it stands', () => {
    const first = tellings([wait()], {}, AWAY)
    const second = tellings([wait()], first.ledger, { ...AWAY, nowMs: 1_000 + REMIND_AFTER_MS })
    const third = tellings([wait()], second.ledger, { ...AWAY, nowMs: 9_000_000 })
    expect(third.say).toEqual([])
  })

  it('forgets a wait the moment it is answered, so the next one speaks again', () => {
    const first = tellings([wait()], {}, AWAY)
    const cleared = tellings([], first.ledger, AWAY)
    expect(cleared.ledger).toEqual({})
    expect(tellings([wait()], cleared.ledger, AWAY).say).toHaveLength(1)
  })

  it('treats a different ask in the same chat as a wait of its own', () => {
    const first = tellings([wait()], {}, AWAY)
    const other = tellings([wait({ mark: 'req-2' })], first.ledger, { ...AWAY, nowMs: 1_100 })
    expect(other.say).toHaveLength(1)
  })

  it('holds a question until the settle grace has passed', () => {
    const green = wait({ kind: 'question', mark: 'turn-1', steady: false })
    const out = tellings([green], {}, AWAY)
    expect(out.say).toEqual([])
    expect(tellings([{ ...green, steady: true }], out.ledger, AWAY).say).toHaveLength(1)
  })

  it('never holds a permission ask, which is explicit whatever else is going', () => {
    expect(tellings([wait({ steady: false })], {}, AWAY).say).toHaveLength(1)
  })

  it('says nothing about a chat the person is looking at, and forgets nothing either', () => {
    const out = tellings([wait({ onScreen: true })], {}, { watching: true, nowMs: 1_000 })
    expect(out.say).toEqual([])
    expect(out.ledger['chat-1']?.times).toBe(0)
  })

  it('speaks as soon as they leave the chat they were looking at', () => {
    const held: Ledger = { 'chat-1': { mark: 'req-1', toldAtMs: 0, times: 0 } }
    expect(tellings([wait()], held, { watching: true, nowMs: 5_000 }).say[0]?.where).toBe('toast')
  })
})

describe('waitsOf: every chat that has stopped, not only the one on screen', () => {
  const titles = new Map([
    ['chat-1', 'Shop'],
    ['chat-2', 'Invoices'],
  ])

  const base = {
    titles,
    openId: 'chat-1',
    onScreen: true,
    open: null,
    openMark: '',
    openSteady: true,
  }

  it('passes over chats that are simply working', () => {
    expect(waitsOf({ ...base, live: { 'chat-2': 'working' } })).toEqual([])
  })

  it('reads the open chat in full, since its conversation is the one on hand', () => {
    const out = waitsOf({
      ...base,
      live: { 'chat-1': 'question' },
      open: { kind: 'question', said: 'Rename or copy?' },
      openMark: 'turn-9',
    })
    expect(out).toEqual([
      {
        chatId: 'chat-1',
        kind: 'question',
        said: 'Rename or copy?',
        mark: 'turn-9',
        title: 'Shop',
        onScreen: true,
        steady: true,
      },
    ])
  })

  it('knows a chat off screen by its state and its name', () => {
    const out = waitsOf({ ...base, live: { 'chat-2': 'asking' } })
    expect(out[0]).toMatchObject({
      chatId: 'chat-2',
      kind: 'permission',
      said: '',
      title: 'Invoices',
      onScreen: false,
      steady: true,
    })
  })

  it('counts the open chat as off screen while the library covers it', () => {
    const out = waitsOf({ ...base, live: { 'chat-1': 'asking' }, onScreen: false })
    expect(out[0]?.onScreen).toBe(false)
  })
})
