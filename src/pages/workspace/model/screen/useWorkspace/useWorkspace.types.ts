import type { useLibraryNotes } from '../../library/useLibraryNotes'
import type { useWorkspace } from './useWorkspace'

// The composition root's answer, one group per domain: a screen part takes
// only the groups it draws from.
export type Workspace = ReturnType<typeof useWorkspace>

export type LibraryNotes = ReturnType<typeof useLibraryNotes>
