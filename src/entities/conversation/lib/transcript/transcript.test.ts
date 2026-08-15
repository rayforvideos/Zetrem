import { describe, expect, it } from 'vitest'
import type { Turn } from '../../model/turn'
import { UNTITLED, chatId, isChatId, packTranscript, readTranscript, titleOf } from './transcript'

function turn(overrides: Partial<Turn> = {}): Turn {
  return {
    role: 'assistant',
    text: '했습니다',
    tools: [],
    draft: '',
    thinking: '',
    startedAtMs: 1,
    ...overrides,
  }
}

const summary = { id: chatId(1, 'aaa'), sessionId: null, savedAtMs: 0 }

describe('chatId: the name becomes the file name', () => {
  it('recognises a name it made', () => {
    expect(isChatId(chatId(Date.parse('2026-08-14'), 'x1y2'))).toBe(true)
  })

  it('refuses a name that walks up a path, so one name cannot touch another file', () => {
    expect(isChatId('../../etc/passwd')).toBe(false)
    expect(isChatId('chat-../x')).toBe(false)
    expect(isChatId('chat-1/2-3')).toBe(false)
    expect(isChatId('')).toBe(false)
    expect(isChatId(7)).toBe(false)
  })
})

describe('titleOf: what the list will call it', () => {
  it('takes the first thing you asked as the title', () => {
    expect(titleOf([turn({ role: 'user', text: '파서를 쪼개줘' }), turn()])).toBe('파서를 쪼개줘')
  })

  it('flattens line breaks, because a list row is one line', () => {
    expect(titleOf([turn({ role: 'user', text: '이거\n  저거' })])).toBe('이거 저거')
  })

  it('cuts a title that runs long', () => {
    expect(titleOf([turn({ role: 'user', text: '가'.repeat(200) })]).length).toBeLessThan(70)
  })

  it('does not invent a title when nothing was asked', () => {
    expect(titleOf([turn()])).toBe(UNTITLED)
    expect(titleOf([])).toBe(UNTITLED)
  })
})

describe('packTranscript: deciding what is worth keeping', () => {
  it('comes back with a title on it', () => {
    expect(packTranscript([turn({ role: 'user', text: '안녕' })], summary).title).toBe('안녕')
  })

  it('drops half-typed text, so reopening does not leave a blinking cursor', () => {
    expect(packTranscript([turn({ draft: '쓰는 중' })], summary).turns[0]!.draft).toBe('')
  })

  it('cuts very long tool output, because one build log would eat the file', () => {
    const long = 'x'.repeat(20_000)
    const packed = packTranscript(
      [
        turn({
          tools: [
            {
              line: 'Bash npm run build',
              toolUseId: 't1',
              input: null,
              result: { stdout: long, stderr: '', isError: false, interrupted: false },
              startedAtMs: 0,
              endedAtMs: 100,
            },
          ],
        }),
      ],
      summary,
    )
    expect(packed.turns[0]!.tools[0]!.result!.stdout.length).toBeLessThan(long.length)
  })

  it('drops the oldest turns, so a long conversation does not grow without bound', () => {
    const many = Array.from({ length: 400 }, (_, i) => turn({ text: `${i}` }))
    const packed = packTranscript(many, summary)
    expect(packed.turns).toHaveLength(200)
    expect(packed.turns.at(-1)!.text).toBe('399')
  })
})

describe('readTranscript: reading what was saved without trusting it', () => {
  it('brings a sound record back', () => {
    const saved = packTranscript([turn({ role: 'user', text: '안녕하세요' })], {
      ...summary,
      sessionId: 'sess-2',
    })
    const back = readTranscript(JSON.parse(JSON.stringify(saved)))
    expect(back?.sessionId).toBe('sess-2')
    expect(back?.title).toBe('안녕하세요')
    expect(back?.turns[0]!.text).toBe('안녕하세요')
  })

  it('treats nonsense as nothing, so a spoiled file cannot stop the app opening', () => {
    expect(readTranscript(null)).toBe(null)
    expect(readTranscript('대화')).toBe(null)
    expect(readTranscript({ id: summary.id, turns: '없음' })).toBe(null)
    expect(readTranscript({ id: summary.id, turns: [] })).toBe(null)
  })

  it('refuses a record whose name is not sound', () => {
    expect(readTranscript({ id: '../x', turns: [turn()] })).toBe(null)
  })

  it('drops only the turns that are not turns', () => {
    const back = readTranscript({ id: summary.id, turns: [turn(), { role: '유령' }, { text: 1 }] })
    expect(back?.turns).toHaveLength(1)
  })

  it('still restores the screen without a session id, and only loses the ability to carry on', () => {
    const back = readTranscript({ id: summary.id, turns: [turn()] })
    expect(back?.sessionId).toBe(null)
    expect(back?.turns).toHaveLength(1)
  })
})
