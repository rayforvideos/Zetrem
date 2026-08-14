import type { NoteLine, TeamNote } from './team-note.types'

export function noteLine(note: TeamNote, sessionLive: boolean): NoteLine {
  switch (note.kind) {
    case 'created':
      return sessionLive
        ? { text: `${note.name} is ready. The running session cannot call them yet.`, restart: true }
        : { text: `${note.name} is ready. They join the next session.`, restart: false }
    case 'updated':
      return sessionLive
        ? { text: `${note.name} updated. The running session holds the old brief.`, restart: true }
        : { text: `${note.name} updated. This applies from the next session.`, restart: false }
    case 'released':
      return sessionLive
        ? { text: `${note.name} left the team. The running session keeps them until it ends.`, restart: false }
        : { text: `${note.name} left the team.`, restart: false }
    case 'trouble':
      return { text: note.text, restart: false }
  }
}
