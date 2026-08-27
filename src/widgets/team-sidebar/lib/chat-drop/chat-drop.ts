// Its own type, so a file dragged in from the desktop is never taken for a carried chat.
export const CARRIED = 'application/x-zetrem-chat'

import type { ChatSummary } from '@/entities/conversation'
import type { Drop } from './chat-drop.types'

export function dropOnChat(dragged: ChatSummary, target: ChatSummary): Drop {
  if (dragged.id === target.id) return { kind: 'none' }
  const there = target.folder.trim()
  if (there.length === 0) return { kind: 'name' }
  // Matched the way fileChats groups folders, so "ops" and "Ops" are one place.
  if (there.toLocaleLowerCase() === dragged.folder.trim().toLocaleLowerCase()) {
    return { kind: 'none' }
  }
  return { kind: 'file', folder: there }
}

// What is being carried cannot be read out of the drag while it is in flight, so the
// list holds onto it and hands it in here.
export function canLand(dragged: ChatSummary | undefined, target: ChatSummary): boolean {
  if (dragged === undefined) return false
  return dropOnChat(dragged, target).kind !== 'none'
}

export function canLandOnFolder(dragged: ChatSummary | null, folderName: string): boolean {
  if (dragged === null) return false
  return dragged.folder.trim().toLocaleLowerCase() !== folderName.trim().toLocaleLowerCase()
}
