import { describe, expect, it } from 'vitest'
import { noteLine } from './team-note'

describe('noteLine: the words and the button never disagree', () => {
  it('says restart only while a session runs, and only then offers the button', () => {
    const live = noteLine({ kind: 'created', name: 'Ray' }, true)
    expect(live.restart).toBe(true)
    expect(live.text).toContain('running session')

    const quiet = noteLine({ kind: 'created', name: 'Ray' }, false)
    expect(quiet.restart).toBe(false)
    expect(quiet.text).not.toContain('running session')
  })

  it('does the same after an edit', () => {
    expect(noteLine({ kind: 'updated', name: 'Ray' }, true).restart).toBe(true)
    expect(noteLine({ kind: 'updated', name: 'Ray' }, false).restart).toBe(false)
  })

  it('offers no button for someone released, since a restart will not bring them back', () => {
    expect(noteLine({ kind: 'released', name: 'Ray' }, true).restart).toBe(false)
    expect(noteLine({ kind: 'released', name: 'Ray' }, true).text).toContain('until it ends')
  })

  it('says a problem as the problem it is', () => {
    expect(noteLine({ kind: 'trouble', text: '파일을 쓰지 못했다' }, true)).toEqual({
      text: '파일을 쓰지 못했다',
      restart: false,
    })
  })

  it('writes no em dash in any note', () => {
    const notes = [
      noteLine({ kind: 'created', name: 'Ray' }, true),
      noteLine({ kind: 'created', name: 'Ray' }, false),
      noteLine({ kind: 'updated', name: 'Ray' }, true),
      noteLine({ kind: 'updated', name: 'Ray' }, false),
      noteLine({ kind: 'released', name: 'Ray' }, true),
      noteLine({ kind: 'released', name: 'Ray' }, false),
    ]
    for (const note of notes) expect(note.text, note.text).not.toContain('—')
  })
})

describe('the restart stays offered while the session is still up', () => {
  it('still asks once the turn has finished, because the session is what holds the old roster', () => {
    // Idle is the easiest moment to restart, not the moment to hide the offer:
    // the child is still up and still cannot call the new teammate. Tying this
    // to "a turn is in flight" took the button away exactly when it was free
    // to press.
    const said = noteLine({ kind: 'created', name: '시에나' }, true)
    expect(said.restart).toBe(true)
  })

  it('offers nothing when there is no session to restart', () => {
    expect(noteLine({ kind: 'created', name: '시에나' }, false).restart).toBe(false)
  })
})

describe('the note says what is true, not what sounds cautious', () => {
  it('says a new teammate is simply ready when nothing is running', () => {
    // "They join the next session" reads as a wait. With no session up there is
    // no wait: whatever you send next already knows them. Saying otherwise
    // while the row sits there pressable says two opposite things at once.
    const said = noteLine({ kind: 'created', name: '테스트' }, false)
    expect(said.text).not.toContain('next session')
    expect(said.restart).toBe(false)
  })

  it('says an edit is in effect when nothing is running', () => {
    expect(noteLine({ kind: 'updated', name: '테스트' }, false).text).not.toContain('next session')
  })

  it('still says what a running session cannot do', () => {
    expect(noteLine({ kind: 'created', name: '테스트' }, true).restart).toBe(true)
  })
})
