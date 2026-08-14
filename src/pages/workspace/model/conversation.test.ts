import { beforeEach, describe, expect, it } from 'vitest'
import { conversation } from './conversation'

beforeEach(() => {
  conversation.reset()
})

describe('conversation — 우리 UI 가 그리는 대화', () => {
  it('사람이 보낸 말이 먼저 선다', () => {
    conversation.say('user', '테스트 고쳐줘')
    const turn = conversation.get().turns[0]!
    expect(turn.role).toBe('user')
    expect(turn.text).toBe('테스트 고쳐줘')
    expect(turn.tools).toEqual([])
    expect(turn.startedAtMs).toBeGreaterThan(0)
  })

  it('에이전트의 말은 새 차례가 되고, 도구 활동은 그 차례에 쌓인다', () => {
    conversation.say('user', '고쳐줘')
    conversation.say('assistant', '파일을 읽겠습니다')
    conversation.tool('Read src/a.ts', null)
    conversation.tool('Edit src/a.ts', null)

    const last = conversation.get().turns.at(-1)!
    expect(last.role).toBe('assistant')
    expect(last.tools.map((tool) => tool.line)).toEqual(['Read src/a.ts', 'Edit src/a.ts'])
  })

  it('에이전트가 말하기 전에 도구를 쓰면 그 차례가 열린다 — 활동이 사라지지 않게', () => {
    conversation.say('user', '고쳐줘')
    conversation.tool('Bash npm test', null)
    const last = conversation.get().turns.at(-1)!
    expect(last.role).toBe('assistant')
    expect(last.tools.map((tool) => tool.line)).toEqual(['Bash npm test'])
  })

  it('이어지는 말은 같은 차례에 붙는다 — 한 턴이 여러 문단으로 와도 말풍선은 하나다', () => {
    conversation.say('assistant', '첫 문단')
    conversation.say('assistant', '둘째 문단')
    expect(conversation.get().turns).toHaveLength(1)
    expect(conversation.get().turns[0]!.text).toBe('첫 문단\n\n둘째 문단')
  })

  it('도구를 쓴 뒤 다시 말하면 새 차례다 — 활동과 말의 순서가 뒤섞이지 않게', () => {
    conversation.say('assistant', '읽어 보겠습니다')
    conversation.tool('Read a.ts', null)
    conversation.say('assistant', '고쳤습니다')
    expect(conversation.get().turns).toHaveLength(2)
    expect(conversation.get().turns.at(-1)!.tools).toEqual([])
  })

  it('도구 결과는 그 눈금에 붙는다 — 어느 도구의 출력인지가 남아야 한다', () => {
    conversation.tool('Bash ls -la', 'toolu_9')
    conversation.toolResult('toolu_9', { stdout: 'total 40', stderr: '', isError: false, interrupted: false })
    const tool = conversation.get().turns.at(-1)!.tools[0]!
    expect(tool.result?.stdout).toBe('total 40')
  })

  it('짝 없는 결과는 버린다 — 어디에 붙일지 모르는 출력은 화면에 세우지 않는다', () => {
    conversation.tool('Bash ls', 'toolu_1')
    conversation.toolResult('없는id', { stdout: 'x', stderr: '', isError: false, interrupted: false })
    expect(conversation.get().turns.at(-1)!.tools[0]!.result).toBeNull()
  })

  it('생각은 차례에 붙되 본문과 섞이지 않는다', () => {
    conversation.think('먼저 파일을 봐야 한다')
    conversation.say('assistant', '봤습니다')
    const turn = conversation.get().turns.at(-1)!
    expect(turn.thinking).toBe('먼저 파일을 봐야 한다')
    expect(turn.text).toBe('봤습니다')
  })

  it('델타는 초안에 쌓인다 — 아직 확정된 말이 아니다', () => {
    conversation.delta('안')
    conversation.delta('녕')
    const turn = conversation.get().turns.at(-1)!
    expect(turn.role).toBe('assistant')
    expect(turn.draft).toBe('안녕')
    expect(turn.text).toBe('')
  })

  it('확정된 말이 오면 초안을 버린다 — 같은 문장이 두 번 뜨지 않게 (실측 근거)', () => {
    conversation.delta('안녕')
    conversation.say('assistant', '안녕')
    const turn = conversation.get().turns.at(-1)!
    expect(turn.draft).toBe('')
    expect(turn.text).toBe('안녕')
    expect(conversation.get().turns).toHaveLength(1)
  })

  it('확정본 없이 끝난 초안은 그 글을 지키고 확정본이 된다 — 이미 사람이 읽은 말이다', () => {
    conversation.delta('여기까지 쓰다 멈')
    conversation.settleDraft()
    const turn = conversation.get().turns.at(-1)!
    expect(turn.text).toBe('여기까지 쓰다 멈')
    expect(turn.draft).toBe('')
    expect(conversation.get().turns).toHaveLength(1)
  })

  it('이미 확정된 말이 있으면 say 와 같은 규칙으로 이어 붙인다 — 문단 사이가 한 벌이다', () => {
    conversation.say('assistant', '먼저 한 말')
    conversation.delta('이어 쓰다 멈')
    conversation.settleDraft()
    expect(conversation.get().turns.at(-1)!.text).toBe('먼저 한 말\n\n이어 쓰다 멈')
  })

  it('정상 턴에서는 아무것도 바뀌지 않는다 — 확정본이 이미 초안을 지웠다', () => {
    conversation.delta('안녕')
    conversation.say('assistant', '안녕하세요')
    const before = conversation.get()
    let count = 0
    const stop = conversation.subscribe(() => {
      count += 1
    })
    conversation.settleDraft()
    expect(count).toBe(0)
    expect(conversation.get()).toBe(before)
    expect(conversation.get().turns.at(-1)!.text).toBe('안녕하세요')
    stop()
  })

  it('도구를 쓴 뒤의 델타는 새 차례를 연다', () => {
    conversation.say('assistant', '읽습니다')
    conversation.tool('Read a.ts', null)
    conversation.delta('고쳤')
    expect(conversation.get().turns).toHaveLength(2)
    expect(conversation.get().turns.at(-1)!.draft).toBe('고쳤')
  })

  it('상태와 권한 질문을 들고 있다 — 화면이 물어볼 곳은 한 곳이다', () => {
    conversation.setStatus('working')
    expect(conversation.get().status).toBe('working')

    conversation.setPermission({ requestId: 'r1', toolName: 'Bash', line: 'Bash ls' })
    expect(conversation.get().permission?.toolName).toBe('Bash')
    conversation.setPermission(null)
    expect(conversation.get().permission).toBeNull()
  })

  it('사건은 자기 차례로 선다 — 말에 섞이지 않는다', () => {
    conversation.say('assistant', '고치고 있습니다')
    conversation.system('7일 한도 28% 사용 — 금 05:00 초기화')
    conversation.say('assistant', '고쳤습니다')

    const turns = conversation.get().turns
    expect(turns.map((turn) => turn.role)).toEqual(['assistant', 'system', 'assistant'])
    expect(turns[1]!.text).toBe('7일 한도 28% 사용 — 금 05:00 초기화')
  })

  it('사건 뒤의 말은 사건에 붙지 않는다', () => {
    conversation.system('여기서 대화가 압축됐습니다')
    conversation.system('두 번째 사건')
    expect(conversation.get().turns).toHaveLength(2)
  })

  it('구독자에게 변화를 알리고, 변화가 없으면 같은 참조다', () => {
    let count = 0
    const stop = conversation.subscribe(() => {
      count += 1
    })
    const before = conversation.get()
    conversation.say('user', '안녕')
    expect(count).toBe(1)
    expect(conversation.get()).not.toBe(before)
    stop()
    conversation.say('user', '또')
    expect(count).toBe(1)
  })
})
