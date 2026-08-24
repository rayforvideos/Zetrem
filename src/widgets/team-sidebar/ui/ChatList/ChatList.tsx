import { useState } from 'react'
import type { ChatListProps } from './ChatList.types'
import { MoreHorizontal, SquarePen } from 'lucide-react'
import type { ChatSummary } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { groupChats } from '../../lib/chat-groups/chat-groups'
import { whenLabel } from '../../lib/when/when'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { named } from '../../lib/named/named'


export function ChatList({ chats, openId, nowMs, onOpen, onStart, onRemove, onRename }: ChatListProps) {
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

      {groupChats(chats, nowMs).map((group) => (
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
              onOpen={onOpen}
              onRemove={onRemove}
              onRename={onRename}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function Row({
  chat,
  open,
  nowMs,
  onOpen,
  onRemove,
  onRename,
}: {
  chat: ChatSummary
  open: boolean
  nowMs: number
  onOpen(id: string): void
  onRemove(id: string): void
  onRename(id: string, wanted: string): void
}) {
  const [editing, setEditing] = useState(false)

  function commit(value: string): void {
    setEditing(false)
    const wanted = value.trim()
    if (wanted.length === 0 || wanted === chat.title) return
    onRename(chat.id, wanted)
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
    <div className="group/chat relative">
      <Button
        data-chat={chat.id}
        variant="ghost"
        size="bare"
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
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setEditing(true)}>{t`Rename`}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(chat.id)}>
              {t`Delete chat`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
