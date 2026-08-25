import type { ChatSummary } from '@/entities/conversation'
import type { Drop } from './chat-drop.types'

// Carrying one chat onto another is the gesture people already know from a home
// screen: two things together make a place to keep them. Landing on a chat that
// already lives somewhere joins that place instead of inventing a third.
//
// The list is sorted, never arranged by hand, so there is no reordering for a
// drop to be confused with — a row means one thing here.
export function dropOnChat(dragged: ChatSummary, target: ChatSummary): Drop {
  if (dragged.id === target.id) return { kind: 'none' }
  const there = target.folder.trim()
  if (there.length === 0) return { kind: 'name' }
  // Matched the way the folders are grouped, so "ops" and "Ops" are one place
  // and dropping between them is not a move.
  if (there.toLocaleLowerCase() === dragged.folder.trim().toLocaleLowerCase()) {
    return { kind: 'none' }
  }
  return { kind: 'file', folder: there }
}

// Whether the ring should promise anything. A drop is only worth drawing when
// something would come of it, and what is being carried cannot be read out of
// the drag itself while it is in flight — the list holds onto it instead.
export function canLand(dragged: ChatSummary | undefined, target: ChatSummary): boolean {
  if (dragged === undefined) return false
  return dropOnChat(dragged, target).kind !== 'none'
}

// The same promise, but for dropping onto a folder itself rather than a row
// inside one: nothing to land when the carried chat already lives there.
export function canLandOnFolder(dragged: ChatSummary | null, folderName: string): boolean {
  if (dragged === null) return false
  return dragged.folder.trim().toLocaleLowerCase() !== folderName.trim().toLocaleLowerCase()
}
