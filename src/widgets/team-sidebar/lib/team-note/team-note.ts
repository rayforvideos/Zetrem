import { t } from '@lingui/core/macro'
import type { NoteLine, TeamNote } from './team-note.types'

// The note says what is true at this moment. While a session is up it holds the
// roster it started with, so a change to the team is something it cannot take
// up — that is worth saying, and worth offering the restart for. With nothing
// running there is no wait to describe: whatever gets sent next already knows
// them, so the note just confirms the change and stops talking.
export function noteLine(note: TeamNote, sessionLive: boolean): NoteLine {
  const who = note.kind === 'trouble' ? '' : note.name
  switch (note.kind) {
    case 'created':
      return sessionLive
        ? { text: t`${who} is ready. The running session cannot call them yet.`, restart: true }
        : { text: t`${who} is ready.`, restart: false }
    case 'updated':
      return sessionLive
        ? { text: t`${who} updated. The running session holds the old brief.`, restart: true }
        : { text: t`${who} updated.`, restart: false }
    case 'released':
      return sessionLive
        ? { text: t`${who} left the team. The running session keeps them until it ends.`, restart: false }
        : { text: t`${who} left the team.`, restart: false }
    case 'trouble':
      return { text: note.text, restart: false }
  }
}
