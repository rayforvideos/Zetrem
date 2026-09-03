import { t } from '@lingui/core/macro'
import type { NoteLine, TeamNote } from './team-note.types'

// A running session holds the roster it started with, so a team change cannot reach it
// until a restart.
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
        ? {
            text: t`${who} left the team. The running session keeps them until it ends.`,
            restart: false,
          }
        : { text: t`${who} left the team.`, restart: false }
    case 'taken':
      return {
        text: t`${who} is already on the team under the other scope. Pick another name.`,
        restart: false,
      }
    case 'trouble':
      return { text: note.text, restart: false }
  }
}
