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
