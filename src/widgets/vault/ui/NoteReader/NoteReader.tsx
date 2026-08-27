import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Bot, Check, Pencil, Trash2, User } from 'lucide-react'
import { linked, noteTitleOf } from '@/entities/vault'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
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
import { sinceOf } from '../../lib/since/since'
import { NoteEditor } from '../NoteEditor/NoteEditor'
import type { NoteReaderProps } from './NoteReader.types'

export function NoteReader({
  note,
  titles,
  backlinks,
  editing,
  guide,
  fresh,
  savedAtMs,
  nowMs,
  onOpen,
  onOpenTitle,
  onRemove,
  onStartEdit,
  onStopEdit,
  onSave,
  onRename,
  onTags,
}: NoteReaderProps) {
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (editing) setAsking(false)
  }, [editing])

  function follow(event: MouseEvent<HTMLDivElement>): void {
    const anchor = (event.target as HTMLElement).closest('a')
    if (anchor === null) return
    const title = noteTitleOf(anchor.getAttribute('href') ?? '')
    if (title === null) return
    event.preventDefault()
    onOpenTitle(title)
  }

  const Glyph = note.source === 'agent' ? Bot : User

  const meta = guide ? (
    <p className="text-xs text-muted-foreground">{t`Vault guide`}</p>
  ) : (
    <p
      data-note-meta
      className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground"
    >
      <Glyph aria-hidden className="size-3 flex-none" />
      <span>{note.source === 'agent' ? t`Agent` : t`You`}</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">{sinceOf(note.updatedAtMs, nowMs)}</span>
      {note.tags.length > 0 && <span aria-hidden>·</span>}
      {note.tags.map((tag) => (
        <span key={tag} data-tag={tag} className="rounded-md bg-card px-1.5 py-px">
          {tag}
        </span>
      ))}
    </p>
  )

  const actions = (
    <div className="flex flex-none items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={editing ? onStopEdit : onStartEdit}
        className="text-muted-foreground"
      >
        {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
        {editing ? t`Done` : t`Edit`}
      </Button>
      {!guide && (
        <Button
          data-note-delete
          variant="ghost"
          size="sm"
          onClick={() => setAsking(true)}
          className="text-muted-foreground"
        >
          <Trash2 className="size-3.5" />
          {t`Delete`}
        </Button>
      )}
    </div>
  )

  return (
    <div
      key={note.id}
      data-selectable
      className="zt-rise zt-scroll flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-6 pb-16"
    >
      <div className="mx-auto flex w-full max-w-[68ch] flex-col">
        <div className="sticky top-0 z-[1] flex flex-col gap-2 bg-background pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {editing ? (
                <NoteEditor
                  key={note.id}
                  note={note}
                  guide={guide}
                  fresh={fresh}
                  onChange={(body) => onSave(note.id, body)}
                  onTitle={(title) => onRename(note.id, title)}
                  onTags={(tags) => onTags(note.id, tags)}
                />
              ) : (
                <>
                  <h2 className="text-xl font-semibold leading-8 tracking-tight">{note.title}</h2>
                  <div className="mt-1">{meta}</div>
                </>
              )}
            </div>
            {actions}
          </div>
          {editing && savedAtMs !== null && (
            <p data-saved className="text-xs text-muted-foreground">
              {t`Saved · ${sinceOf(savedAtMs, nowMs)}`}
            </p>
          )}
        </div>
        {!editing && (
          <>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: the anchors inside the markdown are the real controls, this only reroutes their clicks */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: a keyboard reaches the anchors themselves, which need no help from this */}
            <div onClick={follow}>
              <Markdown text={linked(note.body, titles)} />
            </div>
            {backlinks.length > 0 && (
              <section data-backlinks className="mt-12 flex flex-col gap-1 border-t pt-5">
                <h3 className="px-2 pb-1 text-xs tracking-[0.08em] text-muted-foreground">
                  {t`Linked from`}
                </h3>
                {backlinks.map((one) => (
                  <Button
                    key={one.id}
                    variant="ghost"
                    size="bare"
                    onClick={() => onOpen(one.id)}
                    className="h-auto w-full min-w-0 flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left text-muted-foreground hover:bg-card/60"
                  >
                    <span className="w-full truncate text-sm text-foreground">{one.title}</span>
                    {one.summary.length > 0 && (
                      <span className="w-full truncate text-xs">{one.summary}</span>
                    )}
                  </Button>
                ))}
              </section>
            )}
          </>
        )}
      </div>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Delete the note “${note.title}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`The note is deleted from the vault. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onRemove(note.id)}
            >{t`Delete note`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
