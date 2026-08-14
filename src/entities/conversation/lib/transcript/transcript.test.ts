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

describe('chatId — 이름이 곧 파일 이름이다', () => {
  it('만든 이름은 스스로 알아본다', () => {
    expect(isChatId(chatId(Date.parse('2026-08-14'), 'x1y2'))).toBe(true)
  })

  it('경로를 파고드는 이름은 이름이 아니다 — 이름 하나로 남의 파일을 건드리면 안 된다', () => {
    expect(isChatId('../../etc/passwd')).toBe(false)
    expect(isChatId('chat-../x')).toBe(false)
    expect(isChatId('chat-1/2-3')).toBe(false)
    expect(isChatId('')).toBe(false)
    expect(isChatId(7)).toBe(false)
  })
})

describe('titleOf — 목록에 걸릴 이름', () => {
  it('처음 물어본 말이 제목이다', () => {
    expect(titleOf([turn({ role: 'user', text: '파서를 쪼개줘' }), turn()])).toBe('파서를 쪼개줘')
  })

  it('줄바꿈은 한 줄로 편다 — 목록은 한 줄짜리다', () => {
    expect(titleOf([turn({ role: 'user', text: '이거\n  저거' })])).toBe('이거 저거')
  })

  it('너무 길면 자른다', () => {
    expect(titleOf([turn({ role: 'user', text: '가'.repeat(200) })]).length).toBeLessThan(70)
  })

  it('물어본 적이 없으면 이름을 짓지 않는다', () => {
    expect(titleOf([turn()])).toBe(UNTITLED)
    expect(titleOf([])).toBe(UNTITLED)
  })
})

describe('packTranscript — 무엇을 남길지 정한다', () => {
  it('제목을 붙여 낸다', () => {
    expect(packTranscript([turn({ role: 'user', text: '안녕' })], summary).title).toBe('안녕')
  })

  it('쓰다 만 글자는 남기지 않는다 — 다시 열었을 때 커서만 깜빡이면 안 된다', () => {
    expect(packTranscript([turn({ draft: '쓰는 중' })], summary).turns[0]!.draft).toBe('')
  })

  it('아주 긴 도구 출력은 잘라서 싣는다 — 한 번의 빌드 로그가 파일을 잡아먹는다', () => {
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
            },
          ],
        }),
      ],
      summary,
    )
    expect(packed.turns[0]!.tools[0]!.result!.stdout.length).toBeLessThan(long.length)
  })

  it('오래된 차례는 버린다 — 대화가 길어도 파일은 자란 만큼만 큰다', () => {
    const many = Array.from({ length: 400 }, (_, i) => turn({ text: `${i}` }))
    const packed = packTranscript(many, summary)
    expect(packed.turns).toHaveLength(200)
    expect(packed.turns.at(-1)!.text).toBe('399')
  })
})

describe('readTranscript — 저장된 것을 믿지 않고 읽는다', () => {
  it('제대로 된 기록은 되살린다', () => {
    const saved = packTranscript([turn({ role: 'user', text: '안녕하세요' })], {
      ...summary,
      sessionId: 'sess-2',
    })
    const back = readTranscript(JSON.parse(JSON.stringify(saved)))
    expect(back?.sessionId).toBe('sess-2')
    expect(back?.title).toBe('안녕하세요')
    expect(back?.turns[0]!.text).toBe('안녕하세요')
  })

  it('말이 안 되는 것은 없는 셈 친다 — 상한 파일 때문에 앱이 안 켜지면 안 된다', () => {
    expect(readTranscript(null)).toBe(null)
    expect(readTranscript('대화')).toBe(null)
    expect(readTranscript({ id: summary.id, turns: '없음' })).toBe(null)
    expect(readTranscript({ id: summary.id, turns: [] })).toBe(null)
  })

  it('이름이 성치 않은 기록은 읽지 않는다', () => {
    expect(readTranscript({ id: '../x', turns: [turn()] })).toBe(null)
  })

  it('섞여 들어온 이상한 차례만 골라 버린다', () => {
    const back = readTranscript({ id: summary.id, turns: [turn(), { role: '유령' }, { text: 1 }] })
    expect(back?.turns).toHaveLength(1)
  })

  it('세션 아이디가 없어도 화면은 되살린다 — 이어 붙이지 못할 뿐이다', () => {
    const back = readTranscript({ id: summary.id, turns: [turn()] })
    expect(back?.sessionId).toBe(null)
    expect(back?.turns).toHaveLength(1)
  })
})
