import { bodyEchoesTitle } from '@/entities/library'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { sinceOf } from '../../lib/since/since'
import type { NoteRowProps } from './NoteRow.types'

export function NoteRow({ note, snippet, open, nowMs, onOpen }: NoteRowProps) {
  // A note short enough to be its own title has a summary that repeats it, and
  // a row that prints both says one thing twice. A search snippet is not that:
  // it is there to show where the words were found.
  const echo = bodyEchoesTitle(note.title, note.summary)
  const line = snippet ?? (echo ? '' : note.summary)
  return (
    <Button
      data-note-row={note.id}
      variant="ghost"
      size="bare"
      aria-current={open ? 'true' : undefined}
      onClick={() => onOpen(note.id)}
      className={cn(
        'h-auto w-full min-w-0 flex-col items-stretch gap-1 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
        open ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-card/70',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm leading-tight',
            open ? 'font-medium' : 'text-foreground/90',
          )}
        >
          {note.title}
        </span>
        <span className="flex-none text-xs tabular-nums text-muted-foreground">
          {sinceOf(note.updatedAtMs, nowMs)}
        </span>
      </span>
      {line.length > 0 && (
        <span className="w-full truncate text-xs leading-snug text-muted-foreground">{line}</span>
      )}
    </Button>
  )
}
