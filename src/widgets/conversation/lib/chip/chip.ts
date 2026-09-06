import type { Chip } from './chip.types'

// What a composer chip has to say about one setting. `pick` is what the person
// chose, and is what the menu goes on checking; `inForce` is filled only when
// the running session is on something else, which is the one case the chip has
// to speak about, because the session is what actually decides.
//
// A setting the running session does not report back arrives as null: nothing
// is known to disagree, so the chip says what was picked and nothing more.
// Guessing here would be worse than staying quiet, since the whole point of
// the second value is that the person can trust the first.
export function chipOf<Id extends string>({
  wanted,
  running,
}: {
  wanted: Id
  running: Id | null
}): Chip<Id> {
  return {
    pick: wanted,
    inForce: running === null || running === wanted ? null : running,
  }
}
