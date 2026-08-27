import { useState } from 'react'
import type { ChatListProps, RowKit } from './ChatList.types'
import { Grouped } from './ChatGroups'
import { FolderSection } from './FolderSection'
import { Search, SquarePen } from 'lucide-react'
import type { ChatSummary } from '@/entities/conversation'
import { Button } from '@/shared/ui/button'
import { chatsInFolder, fileChats, renamedFolder } from '../../lib/chat-filing/chat-filing'
import { ROOMY, matchChats } from '../../lib/chat-search/chat-search'
import { dropOnChat } from '../../lib/chat-drop/chat-drop'
import { t } from '@lingui/core/macro'

export function ChatList({
  chats,
  openId,
  nowMs,
  onOpen,
  onStart,
  onRemove,
  onRename,
  onFile,
  onFileMany,
}: ChatListProps) {
  const [query, setQuery] = useState('')
  const looking = query.trim().length > 0
  const { folders, loose } = fileChats(matchChats(chats, query))
  const names = fileChats(chats).folders.map((one) => one.name)
  const nothing = looking && folders.length === 0 && loose.length === 0
  const [pairing, setPairing] = useState<[string, string] | null>(null)
  // A drag cannot be read while it is in flight, so the chat being carried is held here.
  const [carried, setCarried] = useState<ChatSummary | null>(null)

  function paired(name: string | null): void {
    const pair = pairing
    if (name === null || pair === null) return
    setPairing(null)
    for (const id of pair) onFile(id, name)
  }

  function carry(draggedId: string, target: ChatSummary): void {
    setCarried(null)
    const dragged = chats.find((one) => one.id === draggedId)
    if (dragged === undefined) return
    const what = dropOnChat(dragged, target)
    if (what.kind === 'none') return
    if (what.kind === 'file') {
      onFile(dragged.id, what.folder)
      return
    }
    setPairing([dragged.id, target.id])
  }

  const kit: RowKit = {
    openId,
    nowMs,
    names,
    onOpen,
    onRemove,
    onRename,
    onFile,
    onCarry: carry,
    carried,
    onPickUp: setCarried,
    pairing,
    onPaired: paired,
  }

  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        size="bare"
        onClick={onStart}
        className="mb-1 h-9 w-full min-w-0 justify-start gap-2 rounded-lg px-2 text-left text-sm font-medium"
        title={t`Start a conversation from scratch`}
      >
        <SquarePen className="size-4 flex-none text-muted-foreground" />
        <span className="truncate">{t`New chat`}</span>
      </Button>

      {chats.length > ROOMY && (
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('')
            }}
            aria-label={t`Find a chat`}
            placeholder={t`Find a chat`}
            className="h-8 w-full min-w-0 rounded-lg bg-card pr-2 pl-7 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
          />
        </div>
      )}

      {folders.map((folder) => (
        <FolderSection
          key={folder.name}
          folder={folder}
          kit={kit}
          onRenameFolder={(from, to) => onFileMany(renamedFolder(chats, from, to), to)}
          onEmptyFolder={(name) =>
            onFileMany(
              chatsInFolder(chats, name).map((one) => one.id),
              '',
            )
          }
          looking={looking}
        />
      ))}

      <Grouped chats={loose} kit={kit} headClass="mt-3" />

      {nothing && (
        <div className="mt-3 px-2 text-xs text-muted-foreground">{t`No chat by that name`}</div>
      )}
    </div>
  )
}
