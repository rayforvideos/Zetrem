import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEMO_ENCORE, DEMO_SCRIPT } from '../../demo/script'
import { DEMO_STEPS } from '../../demo/steps'

// The demo is the one part of this repo nobody can run in CI: it is a recorded
// session played against the real screen, and the only way to know it still
// works is to walk it. These are the few things about it that can be checked
// without a browser — and they are the ones whose failure leaves a visitor
// stuck in front of a page that never moves again.

async function wiring(): Promise<string> {
  return readFile(join('demo', 'main.demo.tsx'), 'utf8')
}

describe('the recorded walk', () => {
  it('names every stop once', () => {
    const ids = DEMO_STEPS.map((step) => step.id)
    expect(new Set(ids).size, ids.join(', ')).toBe(ids.length)
  })

  it('gives every stop that waits on a press something to press', () => {
    for (const step of DEMO_STEPS) {
      if (step.advance !== 'click') continue
      expect(step.advanceOn ?? step.target, `${step.id} answers to a click`).toBeTruthy()
    }
  })

  it('lets the tape go again for every place it parks', async () => {
    // A hold nobody lifts is the worst failure this page has: the screen keeps
    // whatever it had and no stop ever arrives. Each `holds` beat is lifted by
    // the tour arriving somewhere, so the two counts have to match.
    const parks = DEMO_SCRIPT.filter((beat) => beat.holds === true).length
    const lifts = (await wiring()).match(/releaseTape\(\)/g)?.length ?? 0
    expect(lifts, 'every hold in the tape is lifted by a stop').toBe(parks)
  })

  it('stops for an answer exactly where a stop asks for one', () => {
    const asks = DEMO_SCRIPT.filter((beat) => beat.holdForAnswer === true).length
    const approvals = DEMO_STEPS.filter((step) => step.advanceOn?.includes('approval')).length
    expect(asks).toBe(1)
    expect(approvals).toBe(1)
  })

  it('only steers stops that exist', async () => {
    // The wiring presses the app's own controls by step id. A stop renamed on
    // one side and not the other steers nothing, and the walk goes on with a
    // pane left open over what the next stop is about.
    const text = await wiring()
    const named = [...text.matchAll(/step\.id === '([a-z-]+)'/g)].map((found) => found[1])
    expect(named.length).toBeGreaterThan(0)
    const known = new Set(DEMO_STEPS.map((step) => step.id))
    for (const id of named) expect(known, `${id} is a stop`).toContain(id)
  })

  it('ends both tapes, so the screen is never left working', () => {
    // Without a result the app stays in its working state for good: the
    // composer keeps its stop button and nothing can be asked again.
    for (const [name, tape] of [
      ['the recorded run', DEMO_SCRIPT],
      ['what is said after it', DEMO_ENCORE],
    ] as const) {
      expect(tape.at(-1)?.event.type, `${name} ends`).toBe('result')
    }
  })

  it('never parks the tape that plays after the recording', () => {
    // It answers somebody who is typing into the page with nobody guiding
    // them, so there is no stop left to lift a hold.
    for (const beat of DEMO_ENCORE) {
      expect(beat.holds).toBeUndefined()
      expect(beat.holdForAnswer).toBeUndefined()
    }
  })
})
