import { useState } from 'react'
import type { ChatListProps } from './ChatList.types'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Search,
  SquarePen,
} from 'lucide-react'
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
import { chatsInFolder, fileChats, renamedFolder } from '../../lib/chat-filing/chat-filing'
import { ROOMY, matchChats } from '../../lib/chat-search/chat-search'
import { canLand, canLandOnFolder, dropOnChat } from '../../lib/chat-drop/chat-drop'
import { whenLabel } from '../../lib/when/when'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { named } from '../../lib/named/named'

// Its own type, so a file dragged in from the desktop is never mistaken for a
// chat being carried.
const CARRIED = 'application/x-zetrem-chat'

// Everything a row needs and nothing it decides for itself. Rows are drawn from
// three places — loose, inside a folder, and inside a folder's day bands — and
// they all hand over the same set.
type RowKit = {
  openId: string | null
  nowMs: number
  names: string[]
  onOpen(id: string): void
  onRemove(id: string): void
  onRename(id: string, wanted: string): void
  onFile(id: string, folder: string): void
  onCarry(draggedId: string, target: ChatSummary): void
  carried: ChatSummary | null
  onPickUp(chat: ChatSummary | null): void
  pairing: [string, string] | null
  onPaired(name: string | null): void
}

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
  // A drag cannot be read while it is in flight, so the chat being carried is
  // held here. Without it a ring can only promise that something is being
  // dragged, not that dropping it would do anything.
  const [carried, setCarried] = useState<ChatSummary | null>(null)

  // The pair is named where it landed, so the answer appears under the cursor
  // rather than at the top of the list. Leaving the field alone keeps the pair
  // waiting instead of throwing the drag away.
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

// A run of chats under their day bands. The same run appears loose at the top
// of the list and inside a roomy folder, a margin apart.
function Grouped({
  chats,
  kit,
  headClass,
}: {
  chats: ChatSummary[]
  kit: RowKit
  headClass: string
}) {
  return (
    <>
      {groupChats(chats, kit.nowMs).map((group) => (
        <div key={group.label.message} className="flex flex-col">
          <div className={cn(headClass, 'mb-0.5 px-2 text-xs tracking-wide text-muted-foreground')}>
            {i18n._(group.label)}
          </div>
          {group.chats.map((chat) => (
            <Row key={chat.id} chat={chat} kit={kit} />
          ))}
        </div>
      ))}
    </>
  )
}

function Row({ chat, kit }: { chat: ChatSummary; kit: RowKit }) {
  const {
    names,
    nowMs,
    onOpen,
    onRemove,
    onRename,
    onFile,
    onCarry,
    carried,
    onPickUp,
    pairing,
    onPaired,
  } = kit
  const open = chat.id === kit.openId
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

  if (pairing !== null && pairing[1] === chat.id) {
    return (
      <input
        // biome-ignore lint/a11y/noAutofocus: the field is not on the screen until somebody asks for it, and it stands where the row they pressed was
        autoFocus
        aria-label={t`Name the folder for these two chats`}
        placeholder={t`Folder for both`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onPaired(null)
          if (event.key !== 'Enter') return
          event.preventDefault()
          const wanted = event.currentTarget.value.trim()
          if (wanted.length > 0) onPaired(wanted)
        }}
        className="h-8 w-full min-w-0 rounded-lg bg-card px-2 text-left text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    )
  }

  if (naming) {
    return (
      <input
        // biome-ignore lint/a11y/noAutofocus: the field is not on the screen until somebody asks for it, and it stands where the row they pressed was
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
        className="h-8 w-full min-w-0 rounded-lg bg-card px-2 text-left text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    )
  }

  if (editing) {
    return (
      <input
        defaultValue={named(chat.title)}
        // biome-ignore lint/a11y/noAutofocus: the field is not on the screen until somebody asks for it, and it stands where the row they pressed was
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
        className="h-8 w-full min-w-0 rounded-lg bg-card px-2 text-left text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    )
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a drop target is not something you press, and there is no keyboard gesture to hand it
    <div
      className={cn('group/chat relative rounded-lg', under && 'ring-1 ring-ring bg-card/60')}
      onDragOver={(event) => {
        // Only ring where dropping would actually do something. A ring over the
        // chat being carried, or over its own folder-mate, is a promise the
        // drop cannot keep.
        if (!canLand(carried ?? undefined, chat)) return
        event.preventDefault()
        event.stopPropagation()
        setUnder(true)
      }}
      onDragLeave={(event) => {
        // Fires on every child boundary too, so only a leave that really left.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setUnder(false)
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(CARRIED)) return
        event.preventDefault()
        // A row inside a folder sits inside the folder's own drop target; the
        // row is the more specific answer, so the folder never hears this.
        event.stopPropagation()
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
          onPickUp(chat)
        }}
        onDragEnd={() => onPickUp(null)}
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
                <DropdownMenuItem
                  onSelect={() => setNaming(true)}
                >{t`New folder…`}</DropdownMenuItem>
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
  looking,
  kit,
  onRenameFolder,
  onEmptyFolder,
}: {
  folder: { name: string; chats: ChatSummary[] }
  looking: boolean
  kit: RowKit
  onRenameFolder(from: string, to: string): void
  onEmptyFolder(name: string): void
}) {
  const { carried, onFile } = kit
  const [under, setUnder] = useState(false)
  const [editing, setEditing] = useState(false)
  const [shut, setShut] = useState(false)
  const holdsOpen = folder.chats.some((chat) => chat.id === kit.openId)
  // The chat you are in is never hidden: a folder holding it stays open, and
  // pressing it shut only lasts while it holds nothing of yours. A shut folder
  // cannot show a search match either, so looking opens them all.
  const open = looking || holdsOpen || !shut
  const roomy = folder.chats.length > ROOMY

  if (editing) {
    return (
      <input
        defaultValue={folder.name}
        // biome-ignore lint/a11y/noAutofocus: the field is not on the screen until somebody asks for it, and it stands where the row they pressed was
        autoFocus
        aria-label={t`Rename folder`}
        onFocus={(event) => event.target.select()}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setEditing(false)
          if (event.key !== 'Enter') return
          event.preventDefault()
          const wanted = event.currentTarget.value
          setEditing(false)
          onRenameFolder(folder.name, wanted)
        }}
        className="mt-3 h-8 w-full min-w-0 rounded-lg bg-card px-2 text-left text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    )
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a drop target is not something you press, and there is no keyboard gesture to hand it
    <div
      className={cn(
        'group/folder relative mt-3 flex flex-col gap-0.5 rounded-lg',
        under && 'ring-1 ring-ring bg-card/60',
      )}
      onDragOver={(event) => {
        if (!canLandOnFolder(carried, folder.name)) return
        event.preventDefault()
        setUnder(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setUnder(false)
      }}
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
        onClick={() => setShut(open)}
        aria-expanded={open}
        data-folder={folder.name}
        className="h-8 w-full min-w-0 justify-start gap-1.5 rounded-lg px-2 text-left text-sm text-muted-foreground"
      >
        {open ? (
          <ChevronDown className="size-3.5 flex-none" />
        ) : (
          <ChevronRight className="size-3.5 flex-none" />
        )}
        {open ? (
          <FolderOpen className="size-3.5 flex-none" />
        ) : (
          <Folder className="size-3.5 flex-none" />
        )}
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto flex-none pl-2 font-mono text-xs tabular-nums text-muted-foreground/70 transition-opacity group-hover/folder:opacity-0">
          {folder.chats.length}
        </span>
      </Button>
      <div
        className={cn(
          'pointer-events-none absolute top-0 right-0 flex h-8 items-center rounded-r-lg pr-1 pl-4',
          'bg-linear-to-l from-card from-60% to-transparent',
          'opacity-0 group-hover/folder:pointer-events-auto group-hover/folder:opacity-100',
          'group-focus-within/folder:pointer-events-auto group-focus-within/folder:opacity-100',
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t`More for ${folder.name}`}
              className="rounded-md text-muted-foreground"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setEditing(true)}>{t`Rename`}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEmptyFolder(folder.name)}>
              {t`Take everything out`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && (
        <div className="zt-rise ml-3 flex flex-col gap-0.5 border-l border-border pl-1.5">
          {roomy ? (
            <Grouped chats={folder.chats} kit={kit} headClass="mt-2" />
          ) : (
            folder.chats.map((chat) => <Row key={chat.id} chat={chat} kit={kit} />)
          )}
        </div>
      )}
    </div>
  )
}
