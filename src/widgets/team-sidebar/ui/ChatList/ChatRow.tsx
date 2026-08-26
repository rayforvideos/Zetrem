import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { t } from '@lingui/core/macro'
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
import { CARRIED, canLand } from '../../lib/chat-drop/chat-drop'
import { whenLabel } from '../../lib/when/when'
import { named } from '../../lib/named/named'
import type { RowKit } from './ChatList.types'

export function Row({ chat, kit }: { chat: ChatSummary; kit: RowKit }) {
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
