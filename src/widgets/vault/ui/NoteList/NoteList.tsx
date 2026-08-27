import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { BookOpen, MoreHorizontal, Plus } from 'lucide-react'
import type { VaultFolder, VaultNoteSummary } from '@/entities/vault'
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
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'

const FIELD = 'h-6 min-w-0 flex-1 rounded-md border-0 bg-card px-2 text-xs shadow-none md:text-xs'

export function NoteList({
  folders,
  notes,
  openId,
  guideOpen,
  onOpen,
  onOpenGuide,
  onCreate,
  onAddFolder,
  onRenameFolder,
  onRemoveFolder,
}: {
  folders: VaultFolder[]
  notes: VaultNoteSummary[]
  openId: string | null
  guideOpen: boolean
  onOpen(id: string): void
  onOpenGuide(): void
  onCreate(folder: string, title: string): void
  onAddFolder(name: string): void
  onRenameFolder(name: string, next: string): void
  onRemoveFolder(name: string): void
}) {
  const [naming, setNaming] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [asking, setAsking] = useState<string | null>(null)

  return (
    <div className="zt-scroll flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
      <Button
        data-guide-row
        variant="ghost"
        size="bare"
        aria-current={guideOpen ? 'true' : undefined}
        onClick={onOpenGuide}
        className={cn(
          'h-8 w-full min-w-0 justify-start gap-1.5 rounded-lg px-2 text-left text-sm',
          guideOpen ? 'bg-card text-foreground' : 'text-muted-foreground hover:bg-card/60',
        )}
      >
        <BookOpen className="size-3.5 flex-none" />
        <span className="truncate">{t`Vault guide`}</span>
      </Button>
      {folders.map(({ name }) => {
        const inside = notes.filter((one) => one.folder === name)
        const empty = inside.length === 0
        return (
          <section key={name} data-folder={name} className="group/folder flex flex-col gap-0.5">
            <h3
              className={cn(
                'flex h-6 items-center gap-1.5 px-2 text-xs tracking-[0.08em]',
                empty ? 'text-muted-foreground/60' : 'text-muted-foreground',
              )}
            >
              {renaming === name ? (
                <Input
                  autoFocus
                  defaultValue={name}
                  aria-label={t`Rename folder`}
                  onFocus={(event) => event.target.select()}
                  onBlur={() => setRenaming(null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setRenaming(null)
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    const wanted = event.currentTarget.value.trim()
                    setRenaming(null)
                    if (wanted.length > 0 && wanted !== name) onRenameFolder(name, wanted)
                  }}
                  className={FIELD}
                />
              ) : (
                <>
                  <span className="min-w-0 truncate">{name}</span>
                  {!empty && (
                    <span className="ml-auto flex-none tabular-nums">{inside.length}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t`New note in ${name}`}
                    onClick={() => onCreate(name, t`New note`)}
                    className={cn(
                      'flex-none rounded-md text-muted-foreground',
                      'opacity-0 group-hover/folder:opacity-100 group-focus-within/folder:opacity-100',
                    )}
                  >
                    <Plus />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        data-folder-menu={name}
                        data-removable={empty ? 'true' : 'false'}
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t`More options for the folder ${name}`}
                        className={cn(
                          'flex-none rounded-md text-muted-foreground',
                          'opacity-0 group-hover/folder:opacity-100 group-focus-within/folder:opacity-100',
                        )}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onSelect={() => setRenaming(name)}
                      >{t`Rename`}</DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!empty}
                        onSelect={() => setAsking(name)}
                      >
                        {t`Delete folder`}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </h3>
            {empty
              ? null
              : inside.map((note) => (
                <Button
                  key={note.id}
                  variant="ghost"
                  size="bare"
                  aria-current={note.id === openId ? 'true' : undefined}
                  onClick={() => onOpen(note.id)}
                  className={cn(
                    'h-auto w-full min-w-0 flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left',
                    note.id === openId
                      ? 'bg-card text-foreground'
                      : 'text-muted-foreground hover:bg-card/60',
                  )}
                >
                  <span className="w-full truncate text-sm">{note.title}</span>
                  {note.lead.length > 0 && (
                    <span className="w-full truncate text-xs text-muted-foreground">
                      {note.lead}
                    </span>
                  )}
                </Button>
              ))}
          </section>
        )
      })}
      <div className="mt-2 flex h-8 flex-none items-center">
        {naming ? (
          <Input
            autoFocus
            aria-label={t`Folder name`}
            placeholder={t`Folder name`}
            onBlur={() => setNaming(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setNaming(false)
              if (event.key !== 'Enter') return
              event.preventDefault()
              const wanted = event.currentTarget.value.trim()
              setNaming(false)
              if (wanted.length > 0) onAddFolder(wanted)
            }}
            className="h-8 w-full min-w-0 rounded-lg border-0 bg-card px-2 text-sm shadow-none md:text-sm"
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNaming(true)}
            className="w-full justify-start gap-1.5 rounded-lg px-2 text-muted-foreground"
          >
            <Plus className="size-3.5" />
            {t`New folder`}
          </Button>
        )}
      </div>
      {asking !== null && (
        <FolderDelete
          name={asking}
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            setAsking(null)
            onRemoveFolder(asking)
          }}
        />
      )}
    </div>
  )
}

function FolderDelete({
  name,
  onCancel,
  onConfirm,
}: {
  name: string
  onCancel(): void
  onConfirm(): void
}) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t`Delete the folder “${name}”?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {t`The empty folder is removed from the vault.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t`Delete folder`}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
