import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, MoreHorizontal } from 'lucide-react'
import { t } from '@lingui/core/macro'
import type { ChatSummary } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { CARRIED, canLandOnFolder } from '../../lib/chat-drop/chat-drop'
import { ROOMY } from '../../lib/chat-search/chat-search'
import { Row } from './ChatRow'
import { Grouped } from './ChatGroups'
import type { RowKit } from './ChatList.types'

export function FolderSection({
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
