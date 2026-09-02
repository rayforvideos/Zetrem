import { beforeEach, describe, expect, it } from 'vitest'
import { createConversation } from './conversation'

let store = createConversation()

beforeEach(() => {
  store = createConversation()
})

describe('conversation: what our screen draws', () => {
  it('puts what the person said first', () => {
    store.say('user', '테스트 고쳐줘')
    const turn = store.get().turns[0]!
    expect(turn.role).toBe('user')
    expect(turn.text).toBe('테스트 고쳐줘')
    expect(turn.tools).toEqual([])
    expect(turn.startedAtMs).toBeGreaterThan(0)
  })

  it('opens a turn for what the agent says and stacks its tools under it', () => {
    store.say('user', '고쳐줘')
    store.say('assistant', '파일을 읽겠습니다')
    store.tool('Read src/a.ts', null)
    store.tool('Edit src/a.ts', null)

    const last = store.get().turns.at(-1)!
    expect(last.role).toBe('assistant')
    expect(last.tools.map((tool) => tool.line)).toEqual(['Read src/a.ts', 'Edit src/a.ts'])
  })

  it('opens a turn for a tool used before any words, so the work is not lost', () => {
    store.say('user', '고쳐줘')
    store.tool('Bash npm test', null)
    const last = store.get().turns.at(-1)!
    expect(last.role).toBe('assistant')
    expect(last.tools.map((tool) => tool.line)).toEqual(['Bash npm test'])
  })

  it('joins later words to the same turn, so one turn is one bubble', () => {
    store.say('assistant', '첫 문단')
    store.say('assistant', '둘째 문단')
    expect(store.get().turns).toHaveLength(1)
    expect(store.get().turns[0]!.text).toBe('첫 문단\n\n둘째 문단')
  })

  it('opens a new turn for words after a tool, so order is kept', () => {
    store.say('assistant', '읽어 보겠습니다')
    store.tool('Read a.ts', null)
    store.say('assistant', '고쳤습니다')
    expect(store.get().turns).toHaveLength(2)
    expect(store.get().turns.at(-1)!.tools).toEqual([])
  })

  it('attaches a result to its own tool, so it is clear whose output it is', () => {
    store.tool('Bash ls -la', 'toolu_9')
    store.toolResult('toolu_9', {
      stdout: 'total 40',
      stderr: '',
      isError: false,
      interrupted: false,
    })
    const tool = store.get().turns.at(-1)!.tools[0]!
    expect(tool.result?.stdout).toBe('total 40')
  })

  it('drops a result with no tool to attach to', () => {
    store.tool('Bash ls', 'toolu_1')
    store.toolResult('없는id', {
      stdout: 'x',
      stderr: '',
      isError: false,
      interrupted: false,
    })
    expect(store.get().turns.at(-1)!.tools[0]!.result).toBeNull()
  })

  it('keeps thinking on the turn without mixing it into the reply', () => {
    store.think('먼저 파일을 봐야 한다')
    store.say('assistant', '봤습니다')
    const turn = store.get().turns.at(-1)!
    expect(turn.thinking).toBe('먼저 파일을 봐야 한다')
    expect(turn.text).toBe('봤습니다')
  })

  it('gathers deltas into a draft, which is not settled text yet', () => {
    store.delta('안')
    store.delta('녕')
    const turn = store.get().turns.at(-1)!
    expect(turn.role).toBe('assistant')
    expect(turn.draft).toBe('안녕')
    expect(turn.text).toBe('')
  })

  it('drops the draft when the settled text arrives, so nothing shows twice', () => {
    store.delta('안녕')
    store.say('assistant', '안녕')
    const turn = store.get().turns.at(-1)!
    expect(turn.draft).toBe('')
    expect(turn.text).toBe('안녕')
    expect(store.get().turns).toHaveLength(1)
  })

  it('keeps a draft that never settled, because it has already been read', () => {
    store.delta('여기까지 쓰다 멈')
    store.settleDraft()
    const turn = store.get().turns.at(-1)!
    expect(turn.text).toBe('여기까지 쓰다 멈')
    expect(turn.draft).toBe('')
    expect(store.get().turns).toHaveLength(1)
  })

  it('settles a draft that a system turn landed on top of, so the cursor does not spin forever', () => {
    store.delta('여기까지 쓰다 멈')
    store.system('This turn: 100 out · 1.0s')
    store.settleDraft()

    const turns = store.get().turns
    expect(turns.map((turn) => turn.role)).toEqual(['assistant', 'system'])
    expect(turns[0]!.text).toBe('여기까지 쓰다 멈')
    expect(turns[0]!.draft).toBe('')
    expect(turns.every((turn) => turn.draft.length === 0)).toBe(true)
  })

  it('joins onto settled text the same way say does, so paragraphs match', () => {
    store.say('assistant', '먼저 한 말')
    store.delta('이어 쓰다 멈')
    store.settleDraft()
    expect(store.get().turns.at(-1)!.text).toBe('먼저 한 말\n\n이어 쓰다 멈')
  })

  it('changes nothing on an ordinary turn, where the settled text cleared the draft', () => {
    store.delta('안녕')
    store.say('assistant', '안녕하세요')
    const before = store.get()
    let count = 0
    const stop = store.subscribe(() => {
      count += 1
    })
    store.settleDraft()
    expect(count).toBe(0)
    expect(store.get()).toBe(before)
    expect(store.get().turns.at(-1)!.text).toBe('안녕하세요')
    stop()
  })

  it('opens a new turn for a delta that follows a tool', () => {
    store.say('assistant', '읽습니다')
    store.tool('Read a.ts', null)
    store.delta('고쳤')
    expect(store.get().turns).toHaveLength(2)
    expect(store.get().turns.at(-1)!.draft).toBe('고쳤')
  })

  it('holds the status and the permission ask, so the screen has one place to look', () => {
    store.setStatus('working')
    expect(store.get().status).toBe('working')

    store.setPermission({ requestId: 'r1', toolName: 'Bash', line: 'Bash ls', detail: 'ls' })
    expect(store.get().permission?.toolName).toBe('Bash')
    store.setPermission(null)
    expect(store.get().permission).toBeNull()
  })

  it('gives an event its own turn instead of mixing it into speech', () => {
    store.say('assistant', '고치고 있습니다')
    store.system('Weekly limit 28% used, resets Fri 5:00 AM')
    store.say('assistant', '고쳤습니다')

    const turns = store.get().turns
    expect(turns.map((turn) => turn.role)).toEqual(['assistant', 'system', 'assistant'])
    expect(turns[1]!.text).toBe('Weekly limit 28% used, resets Fri 5:00 AM')
  })

  it('does not join words onto the event before them', () => {
    store.system('여기서 대화가 압축됐습니다')
    store.system('두 번째 사건')
    expect(store.get().turns).toHaveLength(2)
  })

  it('tells subscribers about a change and hands back the same state when there is none', () => {
    let count = 0
    const stop = store.subscribe(() => {
      count += 1
    })
    const before = store.get()
    store.say('user', '안녕')
    expect(count).toBe(1)
    expect(store.get()).not.toBe(before)
    stop()
    store.say('user', '또')
    expect(count).toBe(1)
  })
})

describe('createConversation: each chat has its own', () => {
  it('keeps two conversations apart', () => {
    const a = createConversation()
    const b = createConversation()
    a.say('user', 'A만')
    expect(a.get().turns).toHaveLength(1)
    expect(b.get().turns).toHaveLength(0)
  })

  it('tells only its own listeners', () => {
    const a = createConversation()
    const b = createConversation()
    let heard = 0
    b.subscribe(() => {
      heard += 1
    })
    a.system('a에서 온 것')
    expect(heard).toBe(0)
  })
})
