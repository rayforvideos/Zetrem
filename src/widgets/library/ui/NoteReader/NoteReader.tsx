import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { linked, noteTitleOf } from '@/entities/library'
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
  const [saving, setSaving] = useState(false)

  // The write is debounced; savedAtMs advancing is when it actually landed.
  useEffect(() => {
    setSaving(false)
  }, [savedAtMs])

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

  const meta = guide ? (
    <p className="text-xs text-muted-foreground">{t`Library guide`}</p>
  ) : (
    <p
      data-note-meta
      className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground"
    >
      {note.source === 'agent' && (
        <span data-note-source="agent" className="rounded-md bg-card px-1.5 py-px text-foreground">
          {t`Filed by an agent`}
        </span>
      )}
      {note.folder.length > 0 && <span data-note-folder>{note.folder}</span>}
      {(note.source === 'agent' || note.folder.length > 0) && <span aria-hidden>·</span>}
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
      {!guide && (
        <Button
          variant="ghost"
          size="sm"
          onClick={editing ? onStopEdit : onStartEdit}
          className="text-muted-foreground"
        >
          {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
          {editing ? t`Done` : t`Edit`}
        </Button>
      )}
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
      <div className="mx-auto flex w-full max-w-[65ch] flex-col">
        <div className="sticky top-0 z-[1] flex flex-col gap-2 bg-background pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {editing ? (
                <NoteEditor
                  key={note.id}
                  note={note}
                  guide={guide}
                  fresh={fresh}
                  onChange={(body) => {
                    setSaving(true)
                    onSave(note.id, body)
                  }}
                  onTitle={(title) => onRename(note.id, title)}
                  onTags={(tags) => onTags(note.id, tags)}
                />
              ) : (
                <>
                  <h2 className="text-2xl font-semibold leading-9 tracking-tight">{note.title}</h2>
                  <div className="mt-1">{meta}</div>
                </>
              )}
            </div>
            {actions}
          </div>
          {editing && (saving || savedAtMs !== null) && (
            <p data-saved className="text-xs text-muted-foreground">
              {saving ? t`Saving…` : t`Saved · ${sinceOf(savedAtMs ?? nowMs, nowMs)}`}
            </p>
          )}
        </div>
        {!editing && (
          <>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: the anchors inside the markdown are the real controls, this only reroutes their clicks */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: a keyboard reaches the anchors themselves, which need no help from this */}
            <div className="text-base leading-7" onClick={follow}>
              <Markdown text={linked(note.body, titles)} />
            </div>
            {backlinks.length > 0 && (
              <section data-backlinks className="mt-14 flex flex-col gap-1.5 border-t pt-6">
                <h3 className="px-1 pb-1 text-xs font-medium tracking-[0.06em] text-muted-foreground">
                  {t`Linked from`} · {backlinks.length}
                </h3>
                {backlinks.map((one) => (
                  <Button
                    key={one.id}
                    variant="ghost"
                    size="bare"
                    onClick={() => onOpen(one.id)}
                    className="h-auto w-full min-w-0 flex-col items-start gap-0.5 rounded-lg bg-card/40 px-3 py-2 text-left text-muted-foreground transition-colors duration-150 hover:bg-card/80"
                  >
                    <span className="w-full truncate text-sm font-medium text-foreground">
                      {one.title}
                    </span>
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
              {t`The note is deleted from the library. This cannot be undone.`}
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
