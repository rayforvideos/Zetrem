import { Bot, User } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { sinceOf } from '../../lib/since/since'
import type { NoteRowProps } from './NoteRow.types'

export function NoteRow({ note, snippet, open, nowMs, onOpen }: NoteRowProps) {
  const Glyph = note.source === 'agent' ? Bot : User
  const line = snippet ?? note.summary
  return (
    <Button
      data-note-row={note.id}
      data-source={note.source}
      variant="ghost"
      size="bare"
      aria-current={open ? 'true' : undefined}
      onClick={() => onOpen(note.id)}
      className={cn(
        'h-auto w-full min-w-0 flex-col items-stretch gap-0.5 rounded-lg px-2 py-1.5 text-left',
        open ? 'bg-card text-foreground' : 'text-muted-foreground hover:bg-card/60',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Glyph aria-hidden className="size-3 flex-none text-muted-foreground" />
        <span className={cn('min-w-0 flex-1 truncate text-sm', open && 'font-medium')}>
          {note.title}
        </span>
        <span className="flex-none text-xs tabular-nums text-muted-foreground">
          {sinceOf(note.updatedAtMs, nowMs)}
        </span>
      </span>
      {line.length > 0 && (
        <span className="w-full truncate pl-[18px] text-xs text-muted-foreground">{line}</span>
      )}
    </Button>
  )
}
