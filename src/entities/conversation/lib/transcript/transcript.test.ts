import { describe, expect, it } from 'vitest'
import type { Turn } from '../../model/turn/turn'
import {
  UNTITLED,
  chatId,
  isChatId,
  packTranscript,
  readTranscript,
  renamed,
  summaryOf,
  titleOf,
} from './transcript'

function turn(overrides: Partial<Turn> = {}): Turn {
  return {
    id: 'turn-fixture',
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

  it('keeps the name somebody gave it, over the first message', () => {
    const packed = packTranscript([turn({ role: 'user', text: '안녕' })], {
      ...summary,
      title: '툴 인벤토리 정리',
    })
    expect(packed.title).toBe('툴 인벤토리 정리')
  })

  it('falls back to the first message when the given name is empty', () => {
    expect(
      packTranscript([turn({ role: 'user', text: '안녕' })], {
        ...summary,
        title: '',
      }).title,
    ).toBe('안녕')
  })

  it('tidies a name for the list: one line, trimmed, capped', () => {
    expect(renamed('  툴 정리\n라벨  ')).toBe('툴 정리 라벨')
    expect(renamed('   ')).toBeNull()
    expect(renamed('가'.repeat(80))?.length).toBe(61)
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
              result: {
                stdout: long,
                stderr: '',
                isError: false,
                interrupted: false,
              },
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
    const back = readTranscript({
      id: summary.id,
      turns: [turn(), { role: '유령' }, { text: 1 }],
    })
    expect(back?.turns).toHaveLength(1)
  })

  it('still restores the screen without a session id, and only loses the ability to carry on', () => {
    const back = readTranscript({ id: summary.id, turns: [turn()] })
    expect(back?.sessionId).toBe(null)
    expect(back?.turns).toHaveLength(1)
  })

  it('leaves a legacy-good turn unchanged', () => {
    const good: Turn = {
      id: 'turn-good',
      role: 'assistant',
      text: '했습니다',
      tools: [
        {
          line: 'Bash npm run build',
          toolUseId: 't1',
          input: { cmd: 'npm run build' },
          result: {
            stdout: 'ok',
            stderr: '',
            isError: false,
            interrupted: false,
          },
          startedAtMs: 10,
          endedAtMs: 20,
        },
      ],
      draft: '',
      thinking: '골똘히',
      startedAtMs: 5,
      to: 'agent-1',
    }
    const back = readTranscript({ id: summary.id, turns: [good] })
    expect(back?.turns[0]).toEqual({ ...good, id: expect.any(String) })
  })

  it('keeps only the attached files that are shaped like one', () => {
    const good = { name: 'shot.png', path: '/tmp/shot.png', kind: 'image' }
    const back = readTranscript({
      id: summary.id,
      turns: [
        turn({
          files: [
            good,
            { name: 'no-kind.txt', path: '/tmp/no-kind.txt' },
            { name: 1, path: '/tmp/x', kind: 'file' },
            { name: 'odd', path: '/tmp/odd', kind: 'folder' },
          ],
        } as never),
      ],
    })
    expect(back?.turns[0]!.files).toEqual([good])
  })

  it('drops a junk tool entry but keeps the turn it lives on', () => {
    const back = readTranscript({
      id: summary.id,
      turns: [turn({ tools: [123, { line: 'ok', startedAtMs: 0 }] as never })],
    })
    expect(back?.turns).toHaveLength(1)
    expect(back?.turns[0]!.tools).toHaveLength(1)
    expect(back?.turns[0]!.tools[0]!.line).toBe('ok')
  })

  it('fills in missing draft, thinking and startedAtMs with defaults', () => {
    const back = readTranscript({
      id: summary.id,
      turns: [{ role: 'assistant', text: '됩니다', tools: [] }],
    })
    expect(back?.turns[0]).toEqual({
      id: expect.any(String),
      role: 'assistant',
      text: '됩니다',
      tools: [],
      draft: '',
      thinking: '',
      startedAtMs: 0,
    })
  })

  it('normalizes a malformed tool result instead of dropping the tool', () => {
    const back = readTranscript({
      id: summary.id,
      turns: [
        turn({
          tools: [
            {
              line: 'Bash echo hi',
              result: { stdout: 'hi', isError: 'yes' },
            } as never,
          ],
        }),
      ],
    })
    expect(back?.turns[0]!.tools[0]!.result).toEqual({
      stdout: 'hi',
      stderr: '',
      isError: false,
      interrupted: false,
    })
    expect(back?.turns[0]!.tools[0]!.toolUseId).toBe(null)
    expect(back?.turns[0]!.tools[0]!.endedAtMs).toBe(null)
  })
})

describe('a saved chat carries what it cost, so reopening it says the same thing', () => {
  const turns = [
    {
      id: 'turn-hello',
      role: 'user' as const,
      text: '안녕',
      tools: [],
      draft: '',
      thinking: '',
      startedAtMs: 0,
    },
  ]

  it('keeps the totals beside the words', () => {
    const spend = {
      usd: 0.42,
      turns: 3,
      tokensOut: 1200,
      tokensIn: 8,
      cacheRead: 5000,
      cacheWrite: 900,
      durationMs: 1800,
      contextUsed: 90_000,
      contextWindow: 1_000_000,
    }
    const packed = packTranscript(
      turns,
      { id: chatId(1, 'aaa'), sessionId: null, savedAtMs: 0 },
      spend,
    )
    expect(packed.spend).toEqual(spend)
    expect(readTranscript(JSON.parse(JSON.stringify(packed)))?.spend?.usd).toBe(0.42)
  })

  it('reads a chat saved before the totals were kept, rather than dropping it', () => {
    const old = {
      id: chatId(1, 'aaa'),
      title: 'x',
      sessionId: null,
      savedAtMs: 0,
      turns,
    }
    const read = readTranscript(old)
    expect(read?.turns).toHaveLength(1)
    expect(read?.spend).toBeNull()
  })

  it('refuses a spoiled total instead of showing a wrong one', () => {
    const bad = {
      id: chatId(1, 'aaa'),
      title: 'x',
      sessionId: null,
      savedAtMs: 0,
      turns,
      spend: { usd: 'lots', turns: 3 },
    }
    expect(readTranscript(bad)?.spend).toBeNull()
  })
})

describe('a chat remembers which folder it was filed under', () => {
  const saved = (over: Record<string, unknown> = {}) => ({
    id: 'chat-mt7b569x-az3pn6',
    turns: [
      {
        id: 't1',
        role: 'user',
        text: '하이',
        tools: [],
        draft: '',
        thinking: '',
        startedAtMs: 1,
      },
    ],
    ...over,
  })

  it('reads a chat filed before folders existed as unfiled', () => {
    // Every chat already on disk has no folder at all. It has to come back as
    // one that simply was never filed, not as a broken file.
    expect(readTranscript(saved())?.folder).toBe('')
  })

  it('carries the folder back out the way it went in', () => {
    expect(readTranscript(saved({ folder: '출고 자동화' }))?.folder).toBe('출고 자동화')
  })

  it('refuses a folder that is not a name', () => {
    expect(readTranscript(saved({ folder: 42 }))?.folder).toBe('')
    expect(readTranscript(saved({ folder: '   ' }))?.folder).toBe('')
  })

  it('tells the list which folder a chat belongs to', () => {
    const one = readTranscript(saved({ folder: '출고 자동화' }))
    expect(summaryOf(one!).folder).toBe('출고 자동화')
  })
})
