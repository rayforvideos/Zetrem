import { useState } from 'react'
import type { ChatListProps } from './ChatList.types'
import { ChevronDown, ChevronRight, Folder, MoreHorizontal, Search, SquarePen } from 'lucide-react'
import type { ChatSummary } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { groupChats } from '../../lib/chat-groups/chat-groups'
import { fileChats } from '../../lib/chat-filing/chat-filing'
import { ROOMY, matchChats } from '../../lib/chat-search/chat-search'
import { dropOnChat } from '../../lib/chat-drop/chat-drop'

// Its own type, so a file dragged in from the desktop is never mistaken for a
// chat being carried.
const CARRIED = 'application/x-zetrem-chat'
import { whenLabel } from '../../lib/when/when'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { named } from '../../lib/named/named'


export function ChatList({ chats, openId, nowMs, onOpen, onStart, onRemove, onRename, onFile }: ChatListProps) {
  const [query, setQuery] = useState('')
  // The folders are the way people actually re-find their own things, so they
  // stay whole and in their places. Looking is the way out when that stops
  // working, and while somebody is looking the folders lie open, because a
  // shut folder cannot show a match.
  const looking = query.trim().length > 0
  const { folders, loose } = fileChats(matchChats(chats, query))
  const names = fileChats(chats).folders.map((one) => one.name)
  const nothing = looking && folders.length === 0 && loose.length === 0
  // Two chats carried together need somewhere to go, so the pair waits here
  // while the name is typed.
  const [pairing, setPairing] = useState<[string, string] | null>(null)

  function carry(draggedId: string, target: ChatSummary): void {
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
            className="h-8 w-full min-w-0 rounded-lg bg-card pr-2 pl-7 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

      {pairing !== null && (
        <input
          autoFocus
          aria-label={t`Folder name`}
          placeholder={t`Folder name`}
          onBlur={() => setPairing(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setPairing(null)
            if (event.key !== 'Enter') return
            event.preventDefault()
            const wanted = event.currentTarget.value.trim()
            const pair = pairing
            setPairing(null)
            if (wanted.length === 0) return
            for (const id of pair) onFile(id, wanted)
          }}
          className="mb-1 h-8 w-full min-w-0 rounded-lg bg-card px-2 text-left text-sm outline-none"
        />
      )}

      {folders.map((folder) => (
        <FolderSection
          key={folder.name}
          folder={folder}
          openId={openId}
          nowMs={nowMs}
          names={names}
          onOpen={onOpen}
          onRemove={onRemove}
          onRename={onRename}
          onFile={onFile}
          onCarry={carry}
          looking={looking}
        />
      ))}

      {groupChats(loose, nowMs).map((group) => (
        <div key={group.label.message} className="flex flex-col">
          <div className="mt-3 mb-0.5 px-2 text-xs tracking-wide text-muted-foreground">
            {i18n._(group.label)}
          </div>
          {group.chats.map((chat) => (
            <Row
              key={chat.id}
              chat={chat}
              open={chat.id === openId}
              nowMs={nowMs}
              names={names}
              onOpen={onOpen}
              onRemove={onRemove}
              onRename={onRename}
              onFile={onFile}
              onCarry={carry}
            />
          ))}
        </div>
      ))}

      {nothing && (
        <div className="mt-3 px-2 text-xs text-muted-foreground">{t`No chat by that name`}</div>
      )}
    </div>
  )
}

function Row({
  chat,
  open,
  nowMs,
  names,
  onOpen,
  onRemove,
  onRename,
  onFile,
  onCarry,
}: {
  chat: ChatSummary
  open: boolean
  nowMs: number
  names: string[]
  onOpen(id: string): void
  onRemove(id: string): void
  onRename(id: string, wanted: string): void
  onFile(id: string, folder: string): void
  onCarry(draggedId: string, target: ChatSummary): void
}) {
  const [editing, setEditing] = useState(false)
  const [naming, setNaming] = useState(false)
  const [asking, setAsking] = useState(false)
  const [under, setUnder] = useState(false)

  function commit(value: string): void {
    setEditing(false)
    const wanted = value.trim()
    if (wanted.length === 0 || wanted === chat.title) return
    onRename(chat.id, wanted)
  }

  if (naming) {
    return (
      <input
        autoFocus
        aria-label={t`Folder name`}
        placeholder={t`Folder name`}
        onBlur={() => setNaming(false)}
        onKeyDown={(event) => {
          // Naming a folder is deliberate: Enter files the chat, and leaving
          // the field walks away rather than making a folder nobody asked for.
          if (event.key === 'Escape') setNaming(false)
          if (event.key !== 'Enter') return
          event.preventDefault()
          const wanted = event.currentTarget.value.trim()
          setNaming(false)
          if (wanted.length > 0) onFile(chat.id, wanted)
        }}
        className="h-8 w-full min-w-0 rounded-lg bg-card px-2 text-left text-sm outline-none"
      />
    )
  }

  if (editing) {
    return (
      <input
        defaultValue={named(chat.title)}
        autoFocus
        aria-label={t`Rename chat`}
        onFocus={(event) => event.target.select()}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          // The chat behind this row may be live; a stray Enter must not
          // reach anything but this field.
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(event.currentTarget.value)
          }
          if (event.key === 'Escape') setEditing(false)
        }}
        className="h-8 w-full min-w-0 rounded-lg bg-card px-2 text-left text-sm outline-none"
      />
    )
  }

  return (
    <div
      className={cn('group/chat relative rounded-lg', under && 'ring-1 ring-foreground/40')}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(CARRIED)) return
        event.preventDefault()
        setUnder(true)
      }}
      onDragLeave={() => setUnder(false)}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(CARRIED)) return
        event.preventDefault()
        setUnder(false)
        onCarry(event.dataTransfer.getData(CARRIED), chat)
      }}
    >
      <Button
        data-chat={chat.id}
        variant="ghost"
        size="bare"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(CARRIED, chat.id)
          event.dataTransfer.effectAllowed = 'move'
        }}
        onClick={() => onOpen(chat.id)}
        onDoubleClick={() => setEditing(true)}
        aria-current={open ? 'true' : undefined}
        className={cn(
          'h-8 w-full min-w-0 justify-start rounded-lg px-2 text-left text-sm',
          open ? 'bg-card text-foreground' : 'text-muted-foreground hover:bg-card/60',
        )}
        title={`${named(chat.title)} · ${whenLabel(chat.savedAtMs, nowMs)}`}
      >
        <span className="truncate">{named(chat.title)}</span>
      </Button>
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex items-center rounded-r-lg pr-1 pl-4',
          'bg-linear-to-l from-card from-60% to-transparent',
          'opacity-0 group-hover/chat:opacity-100 group-focus-within/chat:opacity-100',
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t`More for ${named(chat.title)}`}
              className="rounded-md text-muted-foreground"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setEditing(true)}>{t`Rename`}</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t`Keep in`}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {names
                  .filter((name) => name !== chat.folder)
                  .map((name) => (
                    <DropdownMenuItem key={name} onSelect={() => onFile(chat.id, name)}>
                      {name}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuItem onSelect={() => setNaming(true)}>{t`New folder…`}</DropdownMenuItem>
                {chat.folder.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onFile(chat.id, '')}>
                      {t`Take out of ${chat.folder}`}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem variant="destructive" onSelect={() => setAsking(true)}>
              {t`Delete chat`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Removing a teammate asks first; forgetting a whole conversation is
          no smaller a loss, so it asks the same way. */}
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Delete “${named(chat.title)}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`The saved conversation is deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRemove(chat.id)}>
              {t`Delete chat`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// A folder stands where it is and folds open in place. Nothing else moves, and
// the loose chats below stay where they were — opening a folder shows more, it
// never takes the rest away.
function FolderSection({
  folder,
  openId,
  nowMs,
  names,
  looking,
  onOpen,
  onRemove,
  onRename,
  onFile,
  onCarry,
}: {
  folder: { name: string; chats: ChatSummary[] }
  openId: string | null
  nowMs: number
  names: string[]
  looking: boolean
  onOpen(id: string): void
  onRemove(id: string): void
  onRename(id: string, wanted: string): void
  onFile(id: string, folder: string): void
  onCarry(draggedId: string, target: ChatSummary): void
}) {
  const [under, setUnder] = useState(false)
  const holdsOpen = folder.chats.some((chat) => chat.id === openId)
  const [pressed, setPressed] = useState(holdsOpen)
  // A shut folder cannot show a match, so looking opens every folder it kept.
  const open = looking || pressed
  const roomy = folder.chats.length > ROOMY

  return (
    <div
      className={cn('mt-3 flex flex-col gap-0.5 rounded-lg', under && 'ring-1 ring-foreground/40')}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(CARRIED)) return
        event.preventDefault()
        setUnder(true)
      }}
      onDragLeave={() => setUnder(false)}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(CARRIED)) return
        event.preventDefault()
        setUnder(false)
        onFile(event.dataTransfer.getData(CARRIED), folder.name)
      }}
    >
      <Button
        variant="ghost"
        size="bare"
        onClick={() => setPressed(!open)}
        aria-expanded={open}
        data-folder={folder.name}
        className="h-8 w-full min-w-0 justify-start gap-1.5 rounded-lg px-2 text-left text-sm text-muted-foreground"
      >
        {open ? (
          <ChevronDown className="size-3.5 flex-none" />
        ) : (
          <ChevronRight className="size-3.5 flex-none" />
        )}
        <Folder className="size-3.5 flex-none" />
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto flex-none pl-2 font-mono text-xs tabular-nums text-muted-foreground/70">
          {folder.chats.length}
        </span>
      </Button>
      {open && (
        <div className="zt-rise ml-3 flex flex-col gap-0.5 border-l border-border pl-1.5">
          {roomy
            ? groupChats(folder.chats, nowMs).map((group) => (
                <div key={group.label.message} className="flex flex-col">
                  <div className="mt-2 mb-0.5 px-2 text-xs tracking-wide text-muted-foreground">
                    {i18n._(group.label)}
                  </div>
                  {group.chats.map((chat) => (
                    <Row
                      key={chat.id}
                      chat={chat}
                      open={chat.id === openId}
                      nowMs={nowMs}
                      names={names}
                      onOpen={onOpen}
                      onRemove={onRemove}
                      onRename={onRename}
                      onFile={onFile}
                      onCarry={onCarry}
                    />
                  ))}
                </div>
              ))
            : folder.chats.map((chat) => (
                <Row
                  key={chat.id}
                  chat={chat}
                  open={chat.id === openId}
                  nowMs={nowMs}
                  names={names}
                  onOpen={onOpen}
                  onRemove={onRemove}
                  onRename={onRename}
                  onFile={onFile}
                  onCarry={onCarry}
                />
              ))}
        </div>
      )}
    </div>
  )
}
