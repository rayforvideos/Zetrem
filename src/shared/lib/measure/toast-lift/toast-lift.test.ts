import { describe, expect, it } from 'vitest'
import { TOAST_FLOOR, toastLift } from './toast-lift'

const WINDOW = { windowW: 1440, windowH: 800 }

// A composer at the foot of a full-width conversation: it reaches the right
// edge, which is the corner the toast rests in.
function composer(
  over: Partial<{ top: number; bottom: number; left: number; right: number }> = {},
) {
  return { top: 690, bottom: 770, left: 60, right: 1400, ...over }
}

describe('toastLift: a toast never lands on what the person is reaching for', () => {
  it('stands clear of the status bar when nothing is at the foot of the screen', () => {
    expect(toastLift({ foot: null, ...WINDOW })).toBe(TOAST_FLOOR)
  })

  it('stands above the composer, not on it', () => {
    expect(toastLift({ foot: composer(), ...WINDOW }), '입력창 위 12px').toBe(122)
  })

  it('rises with the composer as lines are typed into it', () => {
    const empty = toastLift({ foot: composer({ top: 720 }), ...WINDOW })
    const grown = toastLift({ foot: composer({ top: 620 }), ...WINDOW })
    expect(grown).toBeGreaterThan(empty)
  })

  it('lifts over the permission card that stands where the composer was', () => {
    expect(toastLift({ foot: composer({ top: 500 }), ...WINDOW })).toBe(312)
  })

  it('leaves the toast where it was when the composer is nowhere near that corner', () => {
    const centred = { top: 300, bottom: 420, left: 336, right: 1104 }
    expect(toastLift({ foot: centred, ...WINDOW }), '빈 대화의 가운데 입력창').toBe(TOAST_FLOOR)
  })

  it('leaves the toast where it was when the conversation is a column on the left', () => {
    const beside = { top: 690, bottom: 770, left: 48, right: 640 }
    expect(toastLift({ foot: beside, ...WINDOW }), '팀원 타일이 오른쪽을 차지한 경우').toBe(
      TOAST_FLOOR,
    )
  })

  it('never dips under the status bar, whatever the foot box reports', () => {
    expect(toastLift({ foot: composer({ top: 795, bottom: 799 }), ...WINDOW })).toBe(TOAST_FLOOR)
  })

  it('never climbs to the titlebar, where it would read as another window', () => {
    expect(toastLift({ foot: composer({ top: 100 }), ...WINDOW })).toBe(622)
  })

  it('keeps the floor even in a window too short to hold both', () => {
    const tight = { windowW: 900, windowH: 200 }
    expect(toastLift({ foot: { top: 50, bottom: 190, left: 0, right: 890 }, ...tight })).toBe(
      TOAST_FLOOR,
    )
  })
})
