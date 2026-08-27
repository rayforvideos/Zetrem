import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { Check, Pencil, Trash2 } from 'lucide-react'
import type { VaultNote } from '@/entities/vault'
import { linked, noteParts, noteTitleOf } from '@/entities/vault'
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
import { NoteEditor } from '../NoteEditor/NoteEditor'

export function NoteReader({
  note,
  titles,
  editing,
  guide,
  fresh,
  onOpenTitle,
  onRemove,
  onStartEdit,
  onStopEdit,
  onSave,
  onRename,
}: {
  note: VaultNote
  titles: ReadonlySet<string>
  editing: boolean
  guide: boolean
  fresh: boolean
  onOpenTitle(title: string): void
  onRemove(id: string): void
  onStartEdit(): void
  onStopEdit(): void
  onSave(id: string, text: string): void
  onRename(id: string, title: string): Promise<boolean>
}) {
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (editing) setAsking(false)
  }, [editing])

  const parts = noteParts(note.text)
  const project = parts.project
  const from = project === null ? null : t`from ${project}`

  function follow(event: MouseEvent<HTMLDivElement>): void {
    const anchor = (event.target as HTMLElement).closest('a')
    if (anchor === null) return
    const title = noteTitleOf(anchor.getAttribute('href') ?? '')
    if (title === null) return
    event.preventDefault()
    onOpenTitle(title)
  }

  const meta = (
    <>
      <p className="truncate text-xs text-muted-foreground">
        {guide
          ? t`Vault guide`
          : `${note.folder} · ${new Date(note.updatedAtMs).toLocaleDateString(i18n.locale)}${
              from === null ? '' : ` · ${from}`
            }`}
      </p>
      {parts.conclusion !== null && (
        <p className="mt-1.5 text-sm text-muted-foreground">{parts.conclusion}</p>
      )}
    </>
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

  const dialog = (
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
          <AlertDialogAction onClick={() => onRemove(note.id)}>{t`Delete note`}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (editing) {
    return (
      <>
        <NoteEditor
          key={note.id}
          note={note}
          title={note.title}
          guide={guide}
          fresh={fresh}
          meta={meta}
          actions={actions}
          onChange={(text) => onSave(note.id, text)}
          onTitle={(title) => onRename(note.id, title)}
        />
        {dialog}
      </>
    )
  }

  return (
    <div
      key={note.id}
      data-selectable
      className="zt-rise zt-scroll flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-2 pb-10"
    >
      <div className="sticky top-0 z-[1] flex flex-col gap-1.5 bg-background pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="h-7 truncate text-base font-semibold leading-7">{note.title}</h2>
            {meta}
          </div>
          {actions}
        </div>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the anchors inside the markdown are the real controls, this only reroutes their clicks */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: a keyboard reaches the anchors themselves, which need no help from this */}
      <div className="pt-2" onClick={follow}>
        <Markdown text={linked(parts.body, titles)} />
      </div>
      {dialog}
    </div>
  )
}
